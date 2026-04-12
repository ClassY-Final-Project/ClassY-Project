import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAILY_API = "https://api.daily.co/v1";
function dailyHeaders() {
  return { Authorization: `Bearer ${process.env.DAILY_API_KEY}`, "Content-Type": "application/json" };
}

// POST /api/live-rooms/[roomId]/end — Canlı dersi bitir (sadece eğitmen)
export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { roomId } = await params;

  try {
    const room = await (prisma as any).liveRoom.findUnique({ where: { id: roomId } });
    if (!room) return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    if (room.instructorId !== user.userId) return NextResponse.json({ error: "Sadece oda sahibi bitirebilir." }, { status: 403 });

    // DB güncelle
    const updated = await (prisma as any).liveRoom.update({
      where: { id: roomId },
      data: { status: "ENDED", endedAt: new Date() },
    });

    // Daily.co oturumunu kapat (opsiyonel — katılımcıları at)
    try {
      await fetch(`${DAILY_API}/rooms/${room.dailyRoomName}`, {
        method: "DELETE",
        headers: dailyHeaders(),
      });
    } catch {
      // Daily.co'dan silinemese bile DB güncellemesi tamamlandı
    }

    return NextResponse.json({ message: "Canlı ders sona erdi.", room: updated });
  } catch (err) {
    console.error("End room error:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
