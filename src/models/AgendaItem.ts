import mongoose, { Schema, Document, Model } from "mongoose";
import crypto from "crypto";

interface IAgendaItem extends Document {
  date: Date;
  title: string;
  content: string;
  platform: string;
  contentHash?: string; // İçerik benzersizliği için hash
  createdAt: Date;
  updatedAt: Date;
}

const AgendaItemSchema = new Schema<IAgendaItem>(
  {
    date: { type: Date, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    platform: { type: String, required: true },
    contentHash: { type: String, index: true }, // Index ekledik hızlı arama için
  },
  { timestamps: true }
);

// Content hash oluşturma helper fonksiyonu
export function generateContentHash(content: string): string {
  return crypto.createHash("sha256").update(content.trim().toLowerCase()).digest("hex");
}

export const AgendaItem: Model<IAgendaItem> =
  mongoose.models.AgendaItem || mongoose.model<IAgendaItem>("AgendaItem", AgendaItemSchema);

