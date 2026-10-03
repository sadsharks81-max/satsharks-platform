import mongoose from "mongoose";

const { Schema } = mongoose;

// Product settings an admin can change without a code release. One document per key.
export interface SettingDoc {
  _id: mongoose.Types.ObjectId;
  key: string;
  value: unknown;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new Schema<SettingDoc>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, minimize: false },
);

export const SettingModel =
  (mongoose.models.Setting as mongoose.Model<SettingDoc> | undefined) ?? mongoose.model<SettingDoc>("Setting", settingSchema);
