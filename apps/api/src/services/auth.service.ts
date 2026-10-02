import bcrypt from "bcryptjs";
import { ROLE_PERMISSIONS, type PublicUser } from "@satsharks/types";
import type { LoginInput, RegisterInput } from "@satsharks/validation";
import { BCRYPT_ROUNDS } from "../config/env";
import type { UserDoc } from "../models";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../utils/app-error";

// Compared against when the email is unknown, so both login failures take the same time.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

export function toPublicUser(user: UserDoc): PublicUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    permissions: [...ROLE_PERMISSIONS[user.role]],
  };
}

export const authService = {
  // Self-registration always creates a student. Staff and admins are created by `npm run create:admin`.
  async register(input: RegisterInput): Promise<UserDoc> {
    if (await userRepository.emailExists(input.email)) {
      throw AppError.conflict("An account with this email already exists");
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    return userRepository.create({ name: input.name, email: input.email, passwordHash, role: "student" });
  },

  async login(input: LoginInput): Promise<UserDoc> {
    const user = await userRepository.findByEmailWithPassword(input.email);
    const matches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !matches) throw AppError.unauthorized("Incorrect email or password");
    if (user.status !== "active") throw AppError.forbidden("This account is not active");
    return user;
  },
};
