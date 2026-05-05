import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAILY_API = "https://api.daily.co/v1";

// GET /api/study-rooms/[roomId]/token — Sesli oda için Daily.co token
export async function GET(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { roomId } = await params;

  try {
    const room = await (prisma as any).studyRoom.findUnique({ where: { id: roomId } });
    if (!room) return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    if (!room.isActive) return NextResponse.json({ error: "Bu oda kapatılmış." }, { status: 400 });
    if (room.type !== "VOICE") return NextResponse.json({ error: "Bu oda sesli oda değil." }, { status: 400 });
    if (!room.dailyRoomName) return NextResponse.json({ error: "Daily.co oda bilgisi eksik." }, { status: 400 });

    // Gerçek Daily.co room URL'sini al
    const roomRes = await fetch(`${DAILY_API}/rooms/${room.dailyRoomName}`, {
      headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}`, "Content-Type": "application/json" },
    });
    const roomData = await roomRes.json();
    const roomUrl: string = roomData.url || `https://classynew.daily.co/${room.dailyRoomName}`;

    // Kullanıcı adını DB'den al
    const dbUser = await (prisma as any).user.findUnique({
      where: { id: user.userId },
      select: { fullName: true, email: true },
    });

    const tokenRes = await fetch(`${DAILY_API}/meeting-tokens`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          room_name: room.dailyRoomName,
          user_name: dbUser?.fullName || dbUser?.email || "Kullanıcı",
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
          enable_screenshare: true,
        },
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.json({ error: "Token alınamadı." }, { status: 502 });
    }

    const { token } = await tokenRes.json();

    return NextResponse.json({ token, roomUrl, dailyRoomName: room.dailyRoomName });
  } catch (err) {
    console.error("Study room token hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
