import mongoose from "mongoose";
import { ANNOUNCEMENT_AUDIENCES, ANNOUNCEMENT_TONES, type AnnouncementAudience, type AnnouncementTone } from "@satsharks/types";

const { Schema } = mongoose;

// A message from SAT Sharks shown as a banner to the students it is meant for.
export interface AnnouncementDoc {
  _id: mongoose.Types.ObjectId;
  title: string;
  message: string;
  audience: AnnouncementAudience;
  tone: AnnouncementTone;
  active: boolean;
  endsAt: Date | null;
  createdBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<AnnouncementDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    audience: { type: String, enum: ANNOUNCEMENT_AUDIENCES, default: "all" },
    tone: { type: String, enum: ANNOUNCEMENT_TONES, default: "info" },
    active: { type: Boolean, default: true },
    endsAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

// Students read the active ones on every page.
announcementSchema.index({ active: 1, createdAt: -1 });

export const AnnouncementModel =
  (mongoose.models.Announcement as mongoose.Model<AnnouncementDoc> | undefined) ??
  mongoose.model<AnnouncementDoc>("Announcement", announcementSchema);
