import type { PasswordResetRequest } from "@testseed/types";
import { Schema, type Connection, type HydratedDocument, type Model } from "mongoose";

export type PasswordResetDocument = HydratedDocument<PasswordResetRequest>;
export type PasswordResetModel = Model<PasswordResetRequest>;

const passwordResetSchema = new Schema<PasswordResetRequest>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    resetCodeHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    attemptsRemaining: {
      type: Number,
      required: true
    },
    createdAt: {
      type: Date,
      required: true
    },
    usedAt: {
      type: Date,
      required: false
    }
  },
  {
    collection: "passwordResets"
  }
);

export function createPasswordResetModel(connection: Connection): PasswordResetModel {
  return (
    connection.models.PasswordReset ??
    connection.model<PasswordResetRequest>("PasswordReset", passwordResetSchema)
  );
}
