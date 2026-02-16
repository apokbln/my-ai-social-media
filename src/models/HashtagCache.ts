import mongoose, { Schema, Document, Model } from "mongoose";

interface IHashtagCache extends Document {
  platform: string;
  hashtags: string[];
  isEstimated: boolean; // AI ile tahmin edilmiş mi?
  lastUpdated: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HashtagCacheSchema = new Schema<IHashtagCache>(
  {
    platform: { 
      type: String, 
      required: true, 
      enum: ["x", "instagram", "linkedin", "tiktok"],
      unique: true,
      index: true 
    },
    hashtags: { 
      type: [String], 
      required: true,
      default: []
    },
    isEstimated: { 
      type: Boolean, 
      required: true, 
      default: true 
    },
    lastUpdated: { 
      type: Date, 
      required: true, 
      default: Date.now 
    },
    expiresAt: { 
      type: Date, 
      required: true,
      index: true,
      default: () => new Date(Date.now() + 6 * 60 * 60 * 1000) // 6 saat sonra expire
    },
  },
  { timestamps: true }
);

// Expire olan kayıtları otomatik sil
HashtagCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const HashtagCache: Model<IHashtagCache> =
  mongoose.models.HashtagCache || mongoose.model<IHashtagCache>("HashtagCache", HashtagCacheSchema);

