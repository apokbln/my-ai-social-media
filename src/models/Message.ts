import mongoose, { Schema, Document, Model } from "mongoose";

interface IMessage extends Document {
  chatId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    chatId: { type: String, required: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
