import { MongoClient, type Collection, type Db } from "mongodb";
import type {
  DirectMongoClient,
  DirectMongoClientFactory,
  DirectMongoCollection,
  DirectMongoDatabase
} from "./direct-mongodb-seeding";

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

  collection(name: string): DirectMongoCollection {
    return new MongoNativeDriverCollection(this.database.collection(name));
  }
}

class MongoNativeDriverCollection implements DirectMongoCollection {
  constructor(private readonly collectionRef: Collection) {}

  async insertMany(records: Record<string, unknown>[]): Promise<{ insertedCount: number }> {
    const result = await this.collectionRef.insertMany(records);
    return {
      insertedCount: result.insertedCount
    };
  }
}
