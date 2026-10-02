import type { UserRole } from "@satsharks/types";
import { UserModel, type UserDoc } from "../models";

export const userRepository = {
  findById(id: string): Promise<UserDoc | null> {
    return UserModel.findById(id).lean<UserDoc>().exec();
  },

  findByEmailWithPassword(email: string): Promise<UserDoc | null> {
    return UserModel.findOne({ email }).select("+passwordHash").lean<UserDoc>().exec();
  },

  async emailExists(email: string): Promise<boolean> {
    return (await UserModel.exists({ email })) !== null;
  },

  async create(input: { name: string; email: string; passwordHash: string; role?: UserRole }): Promise<UserDoc> {
    const created = await UserModel.create(input);
    return created.toObject();
  },
};
