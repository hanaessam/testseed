import mongoose, { type Connection } from "mongoose";

export function createConnection(uri: string): Connection {
  return mongoose.createConnection(uri);
}
