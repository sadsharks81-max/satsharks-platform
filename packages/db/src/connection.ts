import { setServers } from "node:dns";
import mongoose from "mongoose";

let connecting: Promise<typeof mongoose> | null = null;

// Reusable connection: safe to call from the API, the worker and CLI scripts.
export async function connectMongo(uri: string): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!connecting) {
    // Some home routers answer no SRV records, which breaks mongodb+srv:// URIs
    // (querySrv ENODATA). DNS_SERVERS=8.8.8.8,1.1.1.1 sends Node's lookups elsewhere.
    const dnsServers = process.env.DNS_SERVERS?.split(",").map((s) => s.trim()).filter(Boolean);
    if (dnsServers?.length) setServers(dnsServers);
    mongoose.set("strictQuery", true);
    // Reject query operators smuggled in through user input, e.g. { email: { $ne: null } }.
    mongoose.set("sanitizeFilter", true);
    connecting = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 30_000, maxPoolSize: 10 })
      .catch((error) => {
        connecting = null;
        throw error;
      });
  }
  return connecting;
}

export async function disconnectMongo(): Promise<void> {
  connecting = null;
  await mongoose.disconnect();
}

// Query filters are sanitized by default (see sanitizeFilter above). Server-built operators such
// as { $in: [...] } must be wrapped in trusted(). Never wrap anything that came from a request.
export const trusted = mongoose.trusted;

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
