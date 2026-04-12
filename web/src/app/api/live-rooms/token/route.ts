import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAILY_API = "https://api.daily.co/v1";

function dailyHeaders() {
  return {
    Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// POST /api/live-rooms/token — Belirli bir oda için meeting token üret
export async function POST(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  try {
    const body = await request.json();
    const { roomName } = body;

    if (!roomName) {
      return NextResponse.json({ error: "roomName gerekli." }, { status: 400 });
    }

    // Kullanıcı bilgisini al
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { fullName: true, email: true },
    });

    const isOwner = user.role === "INSTRUCTOR" || user.role === "ADMIN";

    // Odanın gerçek URL'sini al
    const roomRes = await fetch(`${DAILY_API}/rooms/${roomName}`, {
      headers: dailyHeaders(),
    });
    const roomData = await roomRes.json();
    const roomUrl: string = roomData.url || `https://classynew.daily.co/${roomName}`;

    const res = await fetch(`${DAILY_API}/meeting-tokens`, {
      method: "POST",
      headers: dailyHeaders(),
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner: isOwner,
          user_name: dbUser?.fullName || dbUser?.email || "Kullanıcı",
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
          enable_recording: isOwner ? "cloud" : undefined,
        },
      }),
    });

    const tokenData = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: tokenData.error || "Token oluşturulamadı." }, { status: 502 });
    }

    return NextResponse.json({ token: tokenData.token, isOwner, roomUrl });
  } catch (err) {
    console.error("Meeting token hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
