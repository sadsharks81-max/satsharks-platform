// Creates (or promotes) a staff/admin account. Self-registration only ever creates students.
//
//   ADMIN_PASSWORD='...' npm run create:admin -- --email you@example.com --name "Your Name" [--role admin|staff]
//
// Developer accounts: add --hidden to keep the account out of the admin Users page, its counts and
// the dashboard stats (see UserDoc.hidden). A developer student is made with --role student
// (country Pakistan), and --paid gives it a paid plan with no end date.
//
// The password comes from the environment so it does not end up in shell history or process lists.
import bcrypt from "bcryptjs";
import { requireEnv } from "@satsharks/config";
import { connectMongo, disconnectMongo, UserModel } from "@satsharks/db";
import { regionForCountry } from "@satsharks/types";
import { registerSchema } from "@satsharks/validation";
import { BCRYPT_ROUNDS } from "../config/env";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const flag = (name: string) => process.argv.includes(`--${name}`);

async function main(): Promise<void> {
  const role = arg("role") ?? "admin";
  if (role !== "admin" && role !== "staff" && role !== "student") throw new Error("--role must be admin, staff or student");
  if (role === "student" && !flag("hidden")) throw new Error("Students sign up on the site; --role student is only for --hidden developer accounts");
  if (flag("paid") && role !== "student") throw new Error("--paid is only for students");

  // Country is asked of students at sign-up; staff accounts made here have none.
  const input = registerSchema.omit({ country: true }).parse({
    name: arg("name"),
    email: arg("email"),
    password: process.env.ADMIN_PASSWORD,
  });

  const set: Record<string, unknown> = { name: input.name, role, status: "active" };
  if (flag("hidden")) set.hidden = true;
  if (role === "student") {
    set.country = "PK";
    set.region = regionForCountry("PK");
  }
  if (flag("paid")) {
    set.plan = "paid";
    set.paidPlan = "till_test_day";
    set.planExpiresAt = null;
  }

  await connectMongo(requireEnv("MONGODB_URI"));
  set.passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await UserModel.findOneAndUpdate({ email: input.email }, { $set: set }, { upsert: true, new: true, setDefaultsOnInsert: true });
  console.log(`${role}${flag("hidden") ? " (hidden)" : ""}${flag("paid") ? " (paid)" : ""} account ready: ${user.email} (${String(user._id)})`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectMongo());
