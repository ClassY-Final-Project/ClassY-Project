import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

type Ctx = { params: Promise<{ roomId: string }> };

// DELETE /api/admin/live-rooms/[roomId] — Canlı dersi sil
export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const { roomId } = await params;

    const existing = await prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!existing) {
      return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    }

    await prisma.liveRoom.delete({ where: { id: roomId } });
    return NextResponse.json({ message: "Canlı ders silindi." });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

// PATCH /api/admin/live-rooms/[roomId] — Durumu güncelle
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const { roomId } = await params;
    const { status } = await request.json();

    if (!["SCHEDULED", "LIVE", "ENDED"].includes(status)) {
      return NextResponse.json({ error: "Geçersiz durum." }, { status: 400 });
    }

    const data: any = { status };
    if (status === "LIVE") data.startedAt = new Date();
    if (status === "ENDED") data.endedAt = new Date();

    const room = await prisma.liveRoom.update({
      where: { id: roomId },
      data,
      select: { id: true, name: true, status: true },
    });

    return NextResponse.json({ room });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
