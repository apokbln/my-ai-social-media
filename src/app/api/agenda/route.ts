import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AgendaItem, generateContentHash } from "@/models/AgendaItem";

// POST /api/agenda - Yeni ajanda kaydı ekle
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { date, title, content, platform } = body;

    if (!date || !title || !content || !platform) {
      return NextResponse.json(
        { error: "Tüm alanlar gerekli (date, title, content, platform)" },
        { status: 400 }
      );
    }

    // Duplicate kontrolü: Aynı içerik daha önce eklenmiş mi?
    const contentHash = generateContentHash(content);
    const existingItem = await AgendaItem.findOne({ contentHash });

    if (existingItem) {
      return NextResponse.json(
        { 
          error: "Bu içerik daha önce ajandaya eklenmiştir.",
          existingItem: {
            _id: existingItem._id,
            date: existingItem.date,
            title: existingItem.title,
          }
        },
        { status: 409 } // Conflict status code
      );
    }

    // YYYY-MM-DD formatındaki tarihi parse et (UTC olarak değil, yerel saat diliminde)
    const [year, month, day] = date.split("-").map(Number);
    const parsedDate = new Date(year, month - 1, day, 12, 0, 0, 0); // Öğlen saatinde (timezone sorunlarını önlemek için)

    const agendaItem = new AgendaItem({
      date: parsedDate,
      title,
      content,
      platform,
      contentHash,
    });

    await agendaItem.save();
    return NextResponse.json({ success: true, agendaItem }, { status: 201 });
  } catch (error) {
    console.error("Ajanda kaydı oluşturulurken hata:", error);
    return NextResponse.json(
      { error: "Ajanda kaydı oluşturulamadı." },
      { status: 500 }
    );
  }
}

// GET /api/agenda - Tarih filtresi ile veya tüm kayıtları getir
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const all = searchParams.get("all");

    let query: any = {};

    // Eğer "all" parametresi varsa tüm kayıtları getir
    if (all === "true") {
      const items = await AgendaItem.find({}).sort({ date: 1, createdAt: -1 });
      return NextResponse.json({ items });
    }

    // Eğer date parametresi varsa o güne ait kayıtları getir
    if (date) {
      // YYYY-MM-DD formatındaki tarihi parse et (UTC olarak değil, yerel saat diliminde)
      const [year, month, day] = date.split("-").map(Number);
      const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const items = await AgendaItem.find(query).sort({ date: 1, createdAt: -1 });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Ajanda kayıtları alınırken hata:", error);
    return NextResponse.json(
      { error: "Ajanda kayıtları yüklenemedi." },
      { status: 500 }
    );
  }
}

