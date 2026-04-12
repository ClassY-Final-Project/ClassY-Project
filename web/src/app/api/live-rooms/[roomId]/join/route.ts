import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAILY_API = "https://api.daily.co/v1";
function dailyHeaders() {
  return { Authorization: `Bearer ${process.env.DAILY_API_KEY}`, "Content-Type": "application/json" };
}

// POST /api/live-rooms/[roomId]/join — Odaya katıl (token al + katılımı kaydet)
export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { roomId } = await params;

  try {
    const room = await (prisma as any).liveRoom.findUnique({
      where: { id: roomId },
      include: { instructor: { select: { id: true, fullName: true, email: true } } },
    });
    if (!room) return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    if (room.status === "ENDED") return NextResponse.json({ error: "Bu canlı ders sona erdi." }, { status: 410 });

    const isInstructor = room.instructorId === user.userId;

    // Öğrenci ise: abonelik kontrolü
    if (!isInstructor && user.role === "STUDENT") {
      const subscription = await (prisma as any).subscription.findUnique({
        where: {
          studentId_instructorId: {
            studentId: user.userId,
            instructorId: room.instructorId,
          },
        },
      });
      if (!subscription) {
        return NextResponse.json(
          { error: "Bu eğitmene abone olmanız gerekiyor.", requiresSubscription: true, instructorId: room.instructorId },
          { status: 403 }
        );
      }
    }

    // Katılımı kaydet (upsert — tekrar katılırsa duplicate olmaz)
    await (prisma as any).roomParticipant.upsert({
      where: { roomId_userId: { roomId, userId: user.userId } },
      create: { roomId, userId: user.userId },
      update: { joinedAt: new Date() },
    });

    // Daily.co token üret
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { fullName: true, email: true },
    });

    const roomRes = await fetch(`${DAILY_API}/rooms/${room.dailyRoomName}`, { headers: dailyHeaders() });
    const roomData = await roomRes.json();

    const tokenRes = await fetch(`${DAILY_API}/meeting-tokens`, {
      method: "POST",
      headers: dailyHeaders(),
      body: JSON.stringify({
        properties: {
          room_name: room.dailyRoomName,
          is_owner: isInstructor,
          user_name: dbUser?.fullName || dbUser?.email || "Kullanıcı",
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
        },
      }),
    });
    const tokenData = await tokenRes.json();

    return NextResponse.json({
      token: tokenData.token,
      roomUrl: roomData.url,
      isOwner: isInstructor,
      room,
    });
  } catch (err) {
    console.error("Join room error:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
