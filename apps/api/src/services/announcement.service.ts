// Announcements: written by admins, shown as banners to the students in their audience.
import { AnnouncementModel, trusted, type AnnouncementDoc, type UserDoc } from "@satsharks/db";
import type { Announcement } from "@satsharks/types";
import type { AnnouncementInput } from "@satsharks/validation";
import { AppError } from "../utils/app-error";
import { hasPaidAccess } from "./access.service";

// More than this at once would bury the page; the newest win.
const MAX_SHOWN = 5;

function toView(doc: AnnouncementDoc): Announcement {
  return {
    id: String(doc._id),
    title: doc.title,
    message: doc.message,
    audience: doc.audience,
    tone: doc.tone,
    active: doc.active,
    endsAt: doc.endsAt ? doc.endsAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

const fields = (input: AnnouncementInput) => ({ ...input, endsAt: input.endsAt ? new Date(input.endsAt) : null });

export const announcementService = {
  // What this account should see now: active, not ended, for everyone or for its plan.
  async forUser(user: Pick<UserDoc, "role" | "plan" | "planExpiresAt">): Promise<Announcement[]> {
    const docs = await AnnouncementModel.find({ active: true, audience: trusted({ $in: ["all", hasPaidAccess(user) ? "paid" : "free"] }) })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean<AnnouncementDoc[]>();
    const now = Date.now();
    return docs
      .filter((doc) => !doc.endsAt || doc.endsAt.getTime() > now)
      .slice(0, MAX_SHOWN)
      .map(toView);
  },

  async list(): Promise<Announcement[]> {
    const docs = await AnnouncementModel.find().sort({ createdAt: -1 }).limit(200).lean<AnnouncementDoc[]>();
    return docs.map(toView);
  },

  async create(input: AnnouncementInput, userId: string): Promise<Announcement> {
    const doc = await AnnouncementModel.create({ ...fields(input), createdBy: userId });
    return toView(doc.toObject());
  },

  async update(id: string, input: AnnouncementInput): Promise<Announcement> {
    const doc = await AnnouncementModel.findByIdAndUpdate(id, { $set: fields(input) }, { new: true }).lean<AnnouncementDoc>();
    if (!doc) throw AppError.notFound("Announcement not found");
    return toView(doc);
  },

  async remove(id: string): Promise<void> {
    const result = await AnnouncementModel.deleteOne({ _id: id });
    if (result.deletedCount === 0) throw AppError.notFound("Announcement not found");
  },
};
