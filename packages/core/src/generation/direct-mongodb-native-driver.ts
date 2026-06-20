import { MongoClient, ObjectId, type Collection, type Db } from "mongodb";
import { isMongoObjectIdString } from "./prepare-dataset-ids-for-insertion";
import type {
  DirectMongoClient,
  DirectMongoClientFactory,
  DirectMongoCollection,
  DirectMongoDatabase
} from "./direct-mongodb-seeding";
import { DirectMongoInsertManyError } from "./direct-mongodb-seeding";

export function createMongoNativeDriverClientFactory(): DirectMongoClientFactory {
  return {
    create(connectionString, options) {
      const client = new MongoClient(connectionString, {
        connectTimeoutMS: options.timeoutMs,
        serverSelectionTimeoutMS: options.timeoutMs
      });
      return new MongoNativeDriverClient(client);
    }
  };
}

class MongoNativeDriverClient implements DirectMongoClient {
  constructor(private readonly client: MongoClient) {}

  async connect(): Promise<void> {
    await this.client.connect();
  }

  db(databaseName?: string): DirectMongoDatabase {
    return new MongoNativeDriverDatabase(this.client.db(databaseName));
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

class MongoNativeDriverDatabase implements DirectMongoDatabase {
  constructor(private readonly database: Db) {}

  get databaseName(): string {
    return this.database.databaseName;
  }

  async command(command: { ping: 1 }): Promise<unknown> {
    return this.database.command(command);
  }

  async listCollectionNames(): Promise<string[]> {
    const collections = await this.database.listCollections().toArray();
    return collections
      .map((collection) => collection.name)
      .filter((name): name is string => Boolean(name) && !name.startsWith("system."));
  }

  collection(name: string): DirectMongoCollection {
    return new MongoNativeDriverCollection(this.database.collection(name));
  }
}

class MongoNativeDriverCollection implements DirectMongoCollection {
  constructor(private readonly collectionRef: Collection) {}

  async deleteMany(filter: Record<string, unknown>): Promise<{ deletedCount: number }> {
    const result = await this.collectionRef.deleteMany(filter);
    return { deletedCount: result.deletedCount ?? 0 };
  }

  async findByIds(ids: string[]): Promise<Record<string, unknown>[]> {
    if (ids.length === 0) {
      return [];
    }

    const mongoIds = ids.map((id) => (isMongoObjectIdString(id) ? new ObjectId(id) : id));
    const documents = await this.collectionRef.find({ _id: { $in: mongoIds as never[] } }).toArray();
    return documents as Record<string, unknown>[];
  }

  async findBySeedBatchId(seedBatchId: string): Promise<Record<string, unknown>[]> {
    const documents = await this.collectionRef.find({ seedBatchId }).toArray();
    return documents as Record<string, unknown>[];
  }

  async upsertMany(records: Record<string, unknown>[]): Promise<{ upsertedCount: number; modifiedCount: number }> {
    if (records.length === 0) {
      return { upsertedCount: 0, modifiedCount: 0 };
    }

    const result = await this.collectionRef.bulkWrite(
      records.map((record) => ({
        replaceOne: {
          filter: { _id: record._id as never },
          replacement: record,
          upsert: true
        }
      })),
      { ordered: false }
    );

    return {
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount
    };
  }

  async insertMany(records: Record<string, unknown>[]): Promise<{ insertedCount: number; insertedIds?: string[] }> {
    try {
      const result = await this.collectionRef.insertMany(records, { ordered: false });
      return {
        insertedCount: result.insertedCount,
        insertedIds: normalizeInsertedIds(result.insertedIds)
      };
    } catch (error) {
      throw new DirectMongoInsertManyError({
        message: error instanceof Error ? error.message : String(error),
        insertedCount: extractInsertedCount(error),
        insertedIds: extractInsertedIds(error)
      });
    }
  }
}

function normalizeInsertedIds(insertedIds: unknown): string[] {
  if (!insertedIds || typeof insertedIds !== "object") {
    return [];
  }

  return Object.entries(insertedIds)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, id]) => String(id));
}

function extractInsertedCount(error: unknown): number {
  const result = extractBulkResult(error);
  const insertedCount = result?.insertedCount ?? result?.result?.nInserted;
  return typeof insertedCount === "number" ? insertedCount : 0;
}

function extractInsertedIds(error: unknown): string[] {
  const result = extractBulkResult(error);
  return normalizeInsertedIds(result?.insertedIds);
}

function extractBulkResult(error: unknown): {
  insertedCount?: number;
  insertedIds?: unknown;
  result?: { nInserted?: number };
} | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const maybeError = error as {
    result?: {
      insertedCount?: number;
      insertedIds?: unknown;
      result?: { nInserted?: number };
    };
  };

  return maybeError.result ?? null;
}
