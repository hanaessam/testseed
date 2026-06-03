import type { EmailChangeVerification } from "@testseed/types";
import { Schema, type Connection, type HydratedDocument, type Model } from "mongoose";

export type EmailChangeDocument = HydratedDocument<EmailChangeVerification>;
export type EmailChangeModel = Model<EmailChangeVerification>;

const emailChangeSchema = new Schema<EmailChangeVerification>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    currentEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    pendingEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    verificationCodeHash: {
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
    }
  },
  {
    collection: "emailChanges"
  }
);

export function createEmailChangeModel(connection: Connection): EmailChangeModel {
  return (
    connection.models.EmailChange ??
    connection.model<EmailChangeVerification>("EmailChange", emailChangeSchema)
  );
}
