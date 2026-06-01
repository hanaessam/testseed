import type { User } from "@testseed/types";
import type { Connection } from "mongoose";
import { createUserModel } from "../models/user";

interface CreateUserInput {
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export function createUserRepository(connection: Connection) {
  const UserModel = createUserModel(connection);

  return {
    async findUserByEmail(email: string): Promise<User | null> {
      const document = await UserModel.findOne({ email }).exec();
      return document ? toUser(document) : null;
    },

    async createUser(input: CreateUserInput): Promise<User> {
      const document = await UserModel.create(input);
      return toUser(document);
    }
  };
}

function toUser(document: {
  _id: unknown;
  email: string;
  passwordHash: string;
  createdAt: Date;
}): User {
  return {
    id: String(document._id),
    email: document.email,
    passwordHash: document.passwordHash,
    createdAt: document.createdAt
  };
}
