import type { EmailChangeVerification, PasswordResetRequest, User } from "@testseed/types";
import type { Connection } from "mongoose";
import { createEmailChangeModel } from "../models/email-change";
import { createPasswordResetModel } from "../models/password-reset";
import { createUserModel } from "../models/user";

interface CreateUserInput {
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export function createUserRepository(connection: Connection) {
  const UserModel = createUserModel(connection);
  const PasswordResetModel = createPasswordResetModel(connection);
  const EmailChangeModel = createEmailChangeModel(connection);

  return {
    async findUserByEmail(email: string): Promise<User | null> {
      const document = await UserModel.findOne({ email }).exec();
      return document ? toUser(document) : null;
    },

    async findUserById(userId: string): Promise<User | null> {
      const document = await UserModel.findById(userId).exec();
      return document ? toUser(document) : null;
    },

    async createUser(input: CreateUserInput): Promise<User> {
      const document = await UserModel.create({
        ...input,
        status: "active",
        updatedAt: input.createdAt
      });
      return toUser(document);
    },

    async updateUserProfile(
      userId: string,
      input: { displayName?: string; pendingEmail?: string; updatedAt: Date }
    ): Promise<User> {
      const update: Record<string, unknown> = {
        updatedAt: input.updatedAt
      };

      if (input.displayName !== undefined) {
        update.displayName = input.displayName;
      }

      if (input.pendingEmail !== undefined) {
        update.pendingEmail = input.pendingEmail;
      }

      const document = await UserModel.findByIdAndUpdate(userId, update, { new: true }).exec();
      if (!document) {
        throw new Error(`User ${userId} was not found`);
      }

      return toUser(document);
    },

    async activatePendingEmail(
      userId: string,
      input: { email: string; updatedAt: Date }
    ): Promise<User> {
      const document = await UserModel.findByIdAndUpdate(
        userId,
        {
          email: input.email,
          $unset: { pendingEmail: "" },
          updatedAt: input.updatedAt
        },
        { new: true }
      ).exec();

      if (!document) {
        throw new Error(`User ${userId} was not found`);
      }

      return toUser(document);
    },

    async updatePasswordHash(
      userId: string,
      input: { passwordHash: string; updatedAt: Date }
    ): Promise<void> {
      await UserModel.updateOne(
        { _id: userId },
        {
          passwordHash: input.passwordHash,
          updatedAt: input.updatedAt
        }
      ).exec();
    },

    async updatePasswordHashByEmail(
      email: string,
      input: { passwordHash: string; updatedAt: Date }
    ): Promise<void> {
      await UserModel.updateOne(
        { email },
        {
          passwordHash: input.passwordHash,
          updatedAt: input.updatedAt
        }
      ).exec();
    },

    async deactivateUser(
      userId: string,
      input: { deactivatedAt: Date; scheduledDeletionAt: Date }
    ): Promise<void> {
      await UserModel.updateOne(
        { _id: userId },
        {
          status: "deactivated",
          deactivatedAt: input.deactivatedAt,
          scheduledDeletionAt: input.scheduledDeletionAt,
          updatedAt: input.deactivatedAt
        }
      ).exec();
    },

    async savePasswordResetRequest(input: PasswordResetRequest): Promise<void> {
      await PasswordResetModel.findOneAndUpdate(
        { email: input.email },
        input,
        { upsert: true, new: true }
      ).exec();
    },

    async findPasswordResetRequest(email: string): Promise<PasswordResetRequest | null> {
      const document = await PasswordResetModel.findOne({ email }).exec();
      return document ? toPasswordResetRequest(document) : null;
    },

    async consumePasswordResetAttempt(email: string): Promise<PasswordResetRequest | null> {
      const document = await PasswordResetModel.findOneAndUpdate(
        { email },
        { $inc: { attemptsRemaining: -1 } },
        { new: true }
      ).exec();

      return document ? toPasswordResetRequest(document) : null;
    },

    async deletePasswordResetRequest(email: string): Promise<void> {
      await PasswordResetModel.deleteOne({ email }).exec();
    },

    async saveEmailChangeVerification(input: EmailChangeVerification): Promise<void> {
      await EmailChangeModel.findOneAndUpdate(
        { userId: input.userId },
        input,
        { upsert: true, new: true }
      ).exec();
    },

    async findEmailChangeVerification(userId: string): Promise<EmailChangeVerification | null> {
      const document = await EmailChangeModel.findOne({ userId }).exec();
      return document ? toEmailChangeVerification(document) : null;
    },

    async consumeEmailChangeVerificationAttempt(
      userId: string
    ): Promise<EmailChangeVerification | null> {
      const document = await EmailChangeModel.findOneAndUpdate(
        { userId },
        { $inc: { attemptsRemaining: -1 } },
        { new: true }
      ).exec();

      return document ? toEmailChangeVerification(document) : null;
    },

    async deleteEmailChangeVerification(userId: string): Promise<void> {
      await EmailChangeModel.deleteOne({ userId }).exec();
    }
  };
}

function toUser(document: {
  _id: unknown;
  email: string;
  passwordHash: string;
  displayName?: string;
  pendingEmail?: string;
  status?: User["status"];
  deactivatedAt?: Date;
  scheduledDeletionAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}): User {
  return {
    id: String(document._id),
    email: document.email,
    passwordHash: document.passwordHash,
    displayName: document.displayName,
    pendingEmail: document.pendingEmail,
    status: document.status ?? "active",
    deactivatedAt: document.deactivatedAt,
    scheduledDeletionAt: document.scheduledDeletionAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt
  };
}

function toPasswordResetRequest(document: {
  email: string;
  resetCodeHash: string;
  expiresAt: Date;
  attemptsRemaining: number;
  createdAt: Date;
  usedAt?: Date;
}): PasswordResetRequest {
  return {
    email: document.email,
    resetCodeHash: document.resetCodeHash,
    expiresAt: document.expiresAt,
    attemptsRemaining: document.attemptsRemaining,
    createdAt: document.createdAt,
    usedAt: document.usedAt
  };
}

function toEmailChangeVerification(document: {
  userId: string;
  currentEmail: string;
  pendingEmail: string;
  verificationCodeHash: string;
  expiresAt: Date;
  attemptsRemaining: number;
  createdAt: Date;
}): EmailChangeVerification {
  return {
    userId: document.userId,
    currentEmail: document.currentEmail,
    pendingEmail: document.pendingEmail,
    verificationCodeHash: document.verificationCodeHash,
    expiresAt: document.expiresAt,
    attemptsRemaining: document.attemptsRemaining,
    createdAt: document.createdAt
  };
}
