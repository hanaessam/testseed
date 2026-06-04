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
    displayName: {
      type: String,
      required: false,
      trim: true
    },
    pendingEmail: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      index: true
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "deactivated", "deleted"],
      default: "active",
      index: true
    },
    deactivatedAt: {
      type: Date,
      required: false
    },
    scheduledDeletionAt: {
      type: Date,
      required: false,
      index: true
    },
    createdAt: {
      type: Date,
      required: true
    },
    updatedAt: {
      type: Date,
      required: true,
      default: () => new Date()
    }
  },
  {
    collection: "users"
  }
);

export function createUserModel(connection: Connection): UserModel {
  return connection.models.User ?? connection.model<Omit<User, "id">>("User", userSchema);
}
