import type { User } from "@testseed/types";
import { Schema, type Connection, type HydratedDocument, type Model } from "mongoose";

export type UserDocument = HydratedDocument<Omit<User, "id">>;
export type UserModel = Model<Omit<User, "id">>;

const userSchema = new Schema<Omit<User, "id">>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      required: true
    }
  },
  {
    collection: "users"
  }
);

export function createUserModel(connection: Connection): UserModel {
  return connection.models.User ?? connection.model<Omit<User, "id">>("User", userSchema);
}
