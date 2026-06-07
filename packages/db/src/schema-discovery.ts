import type { MongoDatabaseInspection } from "@testseed/types";
import type { Connection } from "mongoose";
import { createConnection } from "./connection";

export interface MongoSchemaDiscoveryInspectorOptions {
  createConnection?: (uri: string) => Connection;
}

export function createMongoSchemaDiscoveryInspector(
  options: MongoSchemaDiscoveryInspectorOptions = {}
) {
  const connect = options.createConnection ?? createConnection;

  return {
    async testConnection(connectionString: string): Promise<{ databaseName?: string }> {
      const connection = connect(connectionString);
      try {
        await connection.asPromise();
        return {
          databaseName: connection.db?.databaseName
        };
      } finally {
        await connection.close().catch(() => undefined);
      }
    },

    async inspectDatabase(
      connectionString: string,
      { sampleSize }: { sampleSize: number }
    ): Promise<MongoDatabaseInspection> {
      const connection = connect(connectionString);
      try {
        await connection.asPromise();
        const db = connection.db;
        if (!db) {
          return {
            collections: []
          };
        }

        const collectionInfos = await db.listCollections().toArray();
        const collections = await Promise.all(
          collectionInfos.map(async (collectionInfo) => {
            const sampledDocuments = await db
              .collection(collectionInfo.name)
              .find({})
              .limit(sampleSize + 1)
              .toArray();
            const sampleLimitReached = sampledDocuments.length > sampleSize;
            const documents = sampledDocuments.slice(0, sampleSize);

            return {
              name: collectionInfo.name,
              documents: documents as Record<string, unknown>[],
              sampleLimitReached
            };
          })
        );

        return {
          databaseName: db.databaseName,
          collections
        };
      } finally {
        await connection.close().catch(() => undefined);
      }
    }
  };
}
