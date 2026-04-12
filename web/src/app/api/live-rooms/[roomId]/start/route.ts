import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAILY_API = "https://api.daily.co/v1";
function dailyHeaders() {
  return { Authorization: `Bearer ${process.env.DAILY_API_KEY}`, "Content-Type": "application/json" };
}

// POST /api/live-rooms/[roomId]/start — Canlı dersi başlat (sadece eğitmen)
export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { roomId } = await params;

  try {
    const room = await (prisma as any).liveRoom.findUnique({ where: { id: roomId } });
    if (!room) return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    if (room.instructorId !== user.userId) return NextResponse.json({ error: "Sadece oda sahibi başlatabilir." }, { status: 403 });
    if (room.status === "LIVE") return NextResponse.json({ error: "Ders zaten canlı." }, { status: 400 });
    if (room.status === "ENDED") return NextResponse.json({ error: "Bu ders sona erdi." }, { status: 400 });

    // DB güncelle
    const updated = await (prisma as any).liveRoom.update({
      where: { id: roomId },
      data: { status: "LIVE", startedAt: new Date() },
    });

    // Daily.co meeting token üret (is_owner=true)
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { fullName: true, email: true },
    });

    const tokenRes = await fetch(`${DAILY_API}/meeting-tokens`, {
      method: "POST",
      headers: dailyHeaders(),
      body: JSON.stringify({
        properties: {
          room_name: room.dailyRoomName,
          is_owner: true,
          user_name: dbUser?.fullName || dbUser?.email || "Eğitmen",
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
        },
      }),
    });
    const tokenData = await tokenRes.json();

    // Odanın URL'sini al
    const roomRes = await fetch(`${DAILY_API}/rooms/${room.dailyRoomName}`, { headers: dailyHeaders() });
    const roomData = await roomRes.json();

    return NextResponse.json({
      room: updated,
      token: tokenData.token,
      roomUrl: roomData.url,
    });
  } catch (err) {
    console.error("Start room error:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
