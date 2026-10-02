import mongoose from "mongoose";

const { Schema } = mongoose;

// A file we host ourselves (question images). Stored in MongoDB for now because the files are
// small SVGs and no object storage is configured yet. Questions reference an asset by `key`
// through /api/assets/<key>, so moving the bytes to S3-compatible storage later only changes
// where that route reads from.
export interface AssetDoc {
  _id: mongoose.Types.ObjectId;
  key: string;
  // Where the file was copied from. Unique, so copying is safe to repeat.
  sourceUrl: string;
  contentType: string;
  size: number;
  data: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

const assetSchema = new Schema<AssetDoc>(
  {
    key: { type: String, required: true, unique: true },
    sourceUrl: { type: String, required: true, unique: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true },
);

export const AssetModel =
  (mongoose.models.Asset as mongoose.Model<AssetDoc> | undefined) ?? mongoose.model<AssetDoc>("Asset", assetSchema);
