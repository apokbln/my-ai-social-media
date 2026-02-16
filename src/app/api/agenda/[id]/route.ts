import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AgendaItem } from "@/models/AgendaItem";

// PATCH /api/agenda/[id] - Kayıt düzenleme
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await req.json();
    const { date, title, content, platform } = body;

    const updateData: any = {};
    if (date) {
      // YYYY-MM-DD formatındaki tarihi parse et (UTC olarak değil, yerel saat diliminde)
      const [year, month, day] = date.split("-").map(Number);
      updateData.date = new Date(year, month - 1, day, 12, 0, 0, 0); // Öğlen saatinde (timezone sorunlarını önlemek için)
    }
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (platform) updateData.platform = platform;

    const agendaItem = await AgendaItem.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    );

    if (!agendaItem) {
      return NextResponse.json(
        { error: "Ajanda kaydı bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, agendaItem });
  } catch (error) {
    console.error("Ajanda kaydı güncellenirken hata:", error);
    return NextResponse.json(
      { error: "Ajanda kaydı güncellenemedi." },
      { status: 500 }
    );
  }
}

// DELETE /api/agenda/[id] - Kayıt silme
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const agendaItem = await AgendaItem.findByIdAndDelete(params.id);

    if (!agendaItem) {
      return NextResponse.json(
        { error: "Ajanda kaydı bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ajanda kaydı silinirken hata:", error);
    return NextResponse.json(
      { error: "Ajanda kaydı silinemedi." },
      { status: 500 }
    );
  }
}

