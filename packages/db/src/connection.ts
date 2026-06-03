import mongoose, { type Connection } from "mongoose";

type ConnectionTimeoutOptions = {
  serverSelectionTimeoutMS: number;
};

const defaultConnectionOptions: ConnectionTimeoutOptions = {
  serverSelectionTimeoutMS: 10000
};

export function createConnection(uri: string): Connection {
  return mongoose.createConnection(
    uri,
    defaultConnectionOptions as unknown as Parameters<Connection["openUri"]>[1]
  );
}
