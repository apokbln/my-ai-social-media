import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Message } from "@/models/Message";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (!chatId) {
      return NextResponse.json({ messages: [] });
    }

    await connectDB();

    const total = await Message.countDocuments({ chatId });
    const messages = await Message.find({ chatId })
      .sort({ createdAt: 1 })
      .skip(Math.max(0, total - limit - offset))
      .limit(limit);
    if (!chatId || chatId === "null") {
      return NextResponse.json({ messages: [] });
    }

    return NextResponse.json({ messages, total });
  } catch (error) {
    console.error("Geçmiş alınırken hata:", error);
    return NextResponse.json(
      { error: "Geçmiş yüklenemedi." },
      { status: 500 }
    );
  }
}
