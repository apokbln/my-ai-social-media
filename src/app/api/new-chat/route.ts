import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Message } from "@/models/Message";

export async function POST() {
  try {
    await connectDB();

    // Yeni sohbet: Kullanıcıdan basit bir mesaj ve AI'dan açılış yanıtı
    //const welcomeMsg = {
    //  role: "user",
    //  content: "Yeni bir sohbet başlatıldı.",
   // };
    const aiMsg = {
      role: "ai",
      content: "👋 Merhaba! Ne paylaşmak istediğini yaz, sana öneriler sunayım.",
    };

    //await Message.create(welcomeMsg);
    await Message.create(aiMsg);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Yeni sohbet hatası:", error);
    return NextResponse.json({ success: false });
  }
}
