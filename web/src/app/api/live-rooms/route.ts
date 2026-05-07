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

// GET /api/live-rooms — Tüm odaları listele (LIVE + SCHEDULED)
export async function GET(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter"); // "live" | "scheduled" | "ended" | "history"

    if (filter === "history") {
      const participations = await (prisma as any).roomParticipant.findMany({
        where: { userId: user.userId, room: { status: "ENDED" } },
        include: {
          room: {
            include: { instructor: { select: { id: true, fullName: true, email: true } }, _count: { select: { participants: true } } },
          },
        },
        orderBy: { joinedAt: "desc" },
      });
      const participatedRooms = participations.map((p: any) => ({ ...p.room, joinedAt: p.joinedAt }));
      const participatedIds = new Set(participatedRooms.map((r: any) => r.id));

      let instructorEndedRooms: any[] = [];
      if (user.role !== "STUDENT") {
        instructorEndedRooms = await (prisma as any).liveRoom.findMany({
          where: { instructorId: user.userId, status: "ENDED", id: { notIn: [...participatedIds] as string[] } },
          include: { instructor: { select: { id: true, fullName: true, email: true } }, _count: { select: { participants: true } } },
          orderBy: { endedAt: "desc" },
        });
      }

      const allRooms = [...participatedRooms, ...instructorEndedRooms].sort(
        (a, b) => new Date(b.endedAt || b.joinedAt || b.createdAt).getTime() - new Date(a.endedAt || a.joinedAt || a.createdAt).getTime()
      );

      // Geçmiş odalar için de abonelik bilgisi ekle
      const histInstructorIds = [...new Set(allRooms.map((r: any) => r.instructorId as string))];
      const histSubs = await (prisma as any).subscription.findMany({
        where: { studentId: user.userId, instructorId: { in: histInstructorIds } },
        select: { instructorId: true },
      });
      const histSubSet = new Set(histSubs.map((s: any) => s.instructorId as string));
      const allRoomsWithSub = allRooms.map((r: any) => ({
        ...r,
        isSubscribed: r.instructorId === user.userId || histSubSet.has(r.instructorId),
      }));

      return NextResponse.json({ rooms: allRoomsWithSub });
    }

    const where: any = {};
    if (filter === "live") where.status = "LIVE";
    else if (filter === "scheduled") where.status = "SCHEDULED";
    else if (filter === "ended") where.status = "ENDED";
    else where.status = { in: ["LIVE", "SCHEDULED"] };

    const rooms = await (prisma as any).liveRoom.findMany({
      where,
      include: {
        instructor: { select: { id: true, fullName: true, email: true } },
        _count: { select: { participants: true } },
      },
      orderBy: [{ status: "asc" }, { scheduledAt: "asc" }, { createdAt: "desc" }],
    });

    // Her oda için mevcut kullanıcının eğitmene abonelik durumunu ekle
    const instructorIds = [...new Set(rooms.map((r: any) => r.instructorId as string))];
    const subscriptions = await (prisma as any).subscription.findMany({
      where: { studentId: user.userId, instructorId: { in: instructorIds } },
      select: { instructorId: true },
    });
    const subscribedSet = new Set(subscriptions.map((s: any) => s.instructorId as string));

    const roomsWithSub = rooms.map((r: any) => ({
      ...r,
      isSubscribed: r.instructorId === user.userId || subscribedSet.has(r.instructorId),
    }));

    return NextResponse.json({ rooms: roomsWithSub });
  } catch (err) {
    console.error("Live rooms GET hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

// POST /api/live-rooms — Yeni oda oluştur (INSTRUCTOR/ADMIN)
export async function POST(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  if (user.role === "STUDENT") {
    return NextResponse.json({ error: "Sadece eğitmenler oda oluşturabilir." }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { name, scheduledAt } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "Oda adı en az 2 karakter olmalıdır." }, { status: 400 });
    }

    const dailyRoomName = `classy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const dailyRes = await fetch(`${DAILY_API}/rooms`, {
      method: "POST",
      headers: dailyHeaders(),
      body: JSON.stringify({
        name: dailyRoomName,
        privacy: "public",
        properties: {
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
          enable_chat: true,
          enable_screenshare: true,
          lang: "tr",
        },
      }),
    });
    const dailyRoom = await dailyRes.json();
    if (!dailyRes.ok) {
      return NextResponse.json({ error: "Daily.co oda oluşturulamadı." }, { status: 502 });
    }

    const room = await (prisma as any).liveRoom.create({
      data: {
        name: name.trim(),
        dailyRoomName,
        instructorId: user.userId,
        status: "SCHEDULED",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
      include: { instructor: { select: { fullName: true, email: true } } },
    });

    return NextResponse.json({ room, dailyUrl: dailyRoom.url });
  } catch (err) {
    console.error("Live rooms POST hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
