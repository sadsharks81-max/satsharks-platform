import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { effectivePlan, trusted, UserModel } from "@satsharks/db";
import { regionForCountry, ROLE_PERMISSIONS, type PublicUser } from "@satsharks/types";
import type { LoginInput, RegisterInput, ResetPasswordInput } from "@satsharks/validation";
import { BCRYPT_ROUNDS, env } from "../config/env";
import type { UserDoc } from "../models";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../utils/app-error";
import { emailService } from "./email.service";

// Compared against when the email is unknown, so both login failures take the same time.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

export const PASSWORD_RESET_TTL_MINUTES = 30;

// Only the hash is stored: a database leak does not hand out working reset links.
export const hashResetToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function toPublicUser(user: UserDoc): PublicUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    permissions: [...ROLE_PERMISSIONS[user.role]],
    country: user.country ?? null,
    region: user.region ?? null,
    plan: effectivePlan(user),
  };
}

export const authService = {
  // Self-registration always creates a student. Staff and admins are created by `npm run create:admin`.
  async register(input: RegisterInput): Promise<UserDoc> {
    if (await userRepository.emailExists(input.email)) {
      throw AppError.conflict("An account with this email already exists");
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    return userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: "student",
      country: input.country,
      // Set from the chosen country only, never from the request's IP address.
      region: regionForCountry(input.country),
    });
  },

  async login(input: LoginInput): Promise<UserDoc> {
    const user = await userRepository.findByEmailWithPassword(input.email);
    const matches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !matches) throw AppError.unauthorized("Incorrect email or password");
    if (user.status !== "active") throw AppError.forbidden("This account is not active");
    return user;
  },

  // Answers the same way whether or not the address has an account, and does not wait for the
  // email, so neither the response nor its timing tells an outsider which emails are registered.
  // A new request replaces any earlier link.
  async requestPasswordReset(email: string): Promise<void> {
    const user = await UserModel.findOne({ email, status: "active" }).select("_id name email").lean<UserDoc>();
    if (!user) return;

    const token = randomBytes(32).toString("base64url");
    await UserModel.updateOne(
      { _id: user._id },
      { $set: { resetTokenHash: hashResetToken(token), resetTokenExpiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000) } },
    );
    const link = `${env.CLIENT_URL.replace(/\/$/, "")}/reset-password?token=${token}`;
    void emailService.sendPasswordReset(user.email, user.name, link, PASSWORD_RESET_TTL_MINUTES);
  },

  // Lets the reset page say "this link has expired" before the student types a new password.
  async isResetTokenValid(token: string): Promise<boolean> {
    const found = await UserModel.exists({
      resetTokenHash: hashResetToken(token),
      resetTokenExpiresAt: trusted({ $gt: new Date() }),
      status: "active",
    });
    return found !== null;
  },

  // One atomic update both checks and spends the token, so the same link cannot be used twice even
  // by two requests at once. Every session signed before now stops working.
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const updated = await UserModel.findOneAndUpdate(
      { resetTokenHash: hashResetToken(input.token), resetTokenExpiresAt: trusted({ $gt: new Date() }), status: "active" },
      { $set: { passwordHash, passwordChangedAt: new Date(), resetTokenHash: null, resetTokenExpiresAt: null } },
    ).lean<UserDoc>();
    if (!updated) throw AppError.badRequest("This reset link is invalid or has expired. Request a new one.");
  },
};
