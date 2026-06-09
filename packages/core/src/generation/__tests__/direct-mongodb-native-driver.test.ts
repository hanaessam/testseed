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
    const insertMany = jest.fn().mockResolvedValue({ insertedCount: 2 });
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
    expect(insertMany).toHaveBeenCalledWith([{ _id: "1" }]);
    expect(result).toEqual({ insertedCount: 2 });
    expect(close).toHaveBeenCalledTimes(1);
  });
});
