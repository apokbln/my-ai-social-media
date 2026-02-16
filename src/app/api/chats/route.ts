import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Message } from "@/models/Message";

export async function GET() {
  try {
    await connectDB();

    const chats = await Message.aggregate([
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: "$chatId",
          firstUserMessage: { 
            $first: { 
              $cond: [ { $eq: [ "$role", "user" ] }, "$content", null ] 
            }
          },
          createdAt: { $first: "$createdAt" }
        },
      },
      {
        $project: {
          _id: 0,
          chatId: "$_id",
          title: { 
            $ifNull: [ "$firstUserMessage", "Yeni Sohbet" ] 
          },
          createdAt: "$createdAt"
        },
      },
      { $sort: { createdAt: -1 } }, // En yeni sohbetler üstte olsun
    ]);

    return NextResponse.json({ chats });
  } catch (error) {
    console.error("Sohbetler alınırken hata:", error);
    return NextResponse.json(
      { error: "Sohbetler yüklenemedi." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");
    if (!chatId) {
      return NextResponse.json({ error: "chatId gerekli" }, { status: 400 });
    }
    await connectDB();
    await Message.deleteMany({ chatId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sohbet silinirken hata:", error);
    return NextResponse.json(
      { error: "Sohbet silinemedi." },
      { status: 500 }
    );
  }
} 