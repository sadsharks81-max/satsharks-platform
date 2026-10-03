// Creates (or promotes) a staff/admin account. Self-registration only ever creates students.
//
//   ADMIN_PASSWORD='...' npm run create:admin -- --email you@example.com --name "Your Name" [--role admin|staff]
//
// The password comes from the environment so it does not end up in shell history or process lists.
import bcrypt from "bcryptjs";
import { requireEnv } from "@satsharks/config";
import { connectMongo, disconnectMongo, UserModel } from "@satsharks/db";
import { registerSchema } from "@satsharks/validation";
import { BCRYPT_ROUNDS } from "../config/env";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const role = arg("role") ?? "admin";
  if (role !== "admin" && role !== "staff") throw new Error("--role must be admin or staff");

  // Country is asked of students at sign-up; staff accounts made here have none.
  const input = registerSchema.omit({ country: true }).parse({
    name: arg("name"),
    email: arg("email"),
    password: process.env.ADMIN_PASSWORD,
  });

  await connectMongo(requireEnv("MONGODB_URI"));
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await UserModel.findOneAndUpdate(
    { email: input.email },
    { $set: { name: input.name, passwordHash, role, status: "active" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`${role} account ready: ${user.email} (${String(user._id)})`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectMongo());
