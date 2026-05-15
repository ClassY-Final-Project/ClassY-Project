import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

const DAILY_API = "https://api.daily.co/v1";

function dailyHeaders() {
  return { Authorization: `Bearer ${process.env.DAILY_API_KEY}`, "Content-Type": "application/json" };
}

async function createDailyRoom(name: string) {
  return fetch(`${DAILY_API}/rooms`, {
    method: "POST",
    headers: dailyHeaders(),
    body: JSON.stringify({
      name,
      privacy: "public",
      properties: {
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        enable_chat: false,
        enable_screenshare: true,
        lang: "tr",
      },
    }),
  });
}

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

    let dailyRoomName: string | null = room.dailyRoomName;
    let roomData: any = null;

    // Eğer DB'de dailyRoomName yoksa veya Daily.co'da bulunamıyorsa yeniden oluştur
    if (dailyRoomName) {
      const roomRes = await fetch(`${DAILY_API}/rooms/${dailyRoomName}`, { headers: dailyHeaders() });
      if (roomRes.ok) {
        roomData = await roomRes.json();
      } else {
        // Daily.co'daki oda yok (örn. exp dolmuş) — yeniden oluştur
        dailyRoomName = null;
      }
    }

    if (!dailyRoomName) {
      const newName = `study-${randomBytes(4).toString("hex")}`;
      const createRes = await createDailyRoom(newName);
      if (!createRes.ok) {
        const txt = await createRes.text().catch(() => "");
        console.error("Daily.co oda yeniden oluşturulamadı:", createRes.status, txt);
        return NextResponse.json({ error: "Sesli oda oluşturulamadı." }, { status: 502 });
      }
      roomData = await createRes.json();
      dailyRoomName = newName;
      await (prisma as any).studyRoom.update({
        where: { id: roomId },
        data: { dailyRoomName },
      });
    }

    const roomUrl: string = roomData?.url || `https://classynew.daily.co/${dailyRoomName}`;

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
          room_name: dailyRoomName,
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

    return NextResponse.json({ token, roomUrl, dailyRoomName });
  } catch (err) {
    console.error("Study room token hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
