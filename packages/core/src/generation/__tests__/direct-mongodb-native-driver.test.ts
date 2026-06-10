import { MongoClient } from "mongodb";
import { createMongoNativeDriverClientFactory } from "../direct-mongodb-native-driver";

jest.mock("mongodb", () => ({
  MongoClient: jest.fn()
}));

const MongoClientMock = MongoClient as jest.MockedClass<typeof MongoClient>;

describe("createMongoNativeDriverClientFactory", () => {
  beforeEach(() => {
    MongoClientMock.mockReset();
  });

  it("maps native driver client, ping, insertMany, close, and timeout options", async () => {
    const insertMany = jest.fn().mockResolvedValue({ insertedCount: 2, insertedIds: { 0: "1", 1: "2" } });
    const command = jest.fn().mockResolvedValue({ ok: 1 });
    const collection = jest.fn().mockReturnValue({ insertMany });
    const db = jest.fn().mockReturnValue({
      databaseName: "app",
      command,
      collection
    });
    const connect = jest.fn().mockResolvedValue(undefined);
    const close = jest.fn().mockResolvedValue(undefined);

    MongoClientMock.mockImplementation(
      () =>
        ({
          connect,
          close,
          db
        }) as unknown as MongoClient
    );

    const factory = createMongoNativeDriverClientFactory();
    const client = factory.create("mongodb://example.test/app", { timeoutMs: 6000 });
    await client.connect();
    const database = client.db("app");
    await database.command({ ping: 1 });
    const result = await database.collection("users").insertMany([{ _id: "1" }]);
    await client.close();

    expect(MongoClientMock).toHaveBeenCalledWith("mongodb://example.test/app", {
      connectTimeoutMS: 6000,
      serverSelectionTimeoutMS: 6000
    });
    expect(connect).toHaveBeenCalledTimes(1);
    expect(db).toHaveBeenCalledWith("app");
    expect(database.databaseName).toBe("app");
    expect(command).toHaveBeenCalledWith({ ping: 1 });
    expect(collection).toHaveBeenCalledWith("users");
    expect(insertMany).toHaveBeenCalledWith([{ _id: "1" }], { ordered: false });
    expect(result).toEqual({ insertedCount: 2, insertedIds: ["1", "2"] });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("preserves unordered bulk write partial insert details", async () => {
    const bulkError = new Error("E11000 duplicate key error") as Error & {
      result: { insertedCount: number; insertedIds: Record<number, string> };
    };
    bulkError.result = { insertedCount: 1, insertedIds: { 1: "2" } };
    const insertMany = jest.fn().mockRejectedValue(bulkError);
    const collection = jest.fn().mockReturnValue({ insertMany });
    const db = jest.fn().mockReturnValue({
      databaseName: "app",
      command: jest.fn(),
      collection
    });

    MongoClientMock.mockImplementation(
      () =>
        ({
          connect: jest.fn(),
          close: jest.fn(),
          db
        }) as unknown as MongoClient
    );

    const factory = createMongoNativeDriverClientFactory();
    const client = factory.create("mongodb://example.test/app", { timeoutMs: 6000 });

    await expect(client.db("app").collection("users").insertMany([{ _id: "1" }, { _id: "2" }])).rejects.toMatchObject({
      message: "E11000 duplicate key error",
      insertedCount: 1,
      insertedIds: ["2"]
    });
    expect(insertMany).toHaveBeenCalledWith([{ _id: "1" }, { _id: "2" }], { ordered: false });
  });
});
