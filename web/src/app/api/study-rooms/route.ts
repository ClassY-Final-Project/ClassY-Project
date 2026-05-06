import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

const DAILY_API = "https://api.daily.co/v1";
function dailyHeaders() {
  return {
    Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    "Content-Type": "application/json",
  };
}

const ROOM_CREATION_LIMITS: Record<string, number> = { FREE: 0, GOLD: 1, PLATINUM: 5 };

// GET /api/study-rooms
export async function GET(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { plan: true, planExpiresAt: true } });
    const userPlan = (dbUser?.planExpiresAt && dbUser.planExpiresAt > new Date()) ? (dbUser.plan ?? "FREE") : "FREE";

    await (prisma as any).studyRoom.updateMany({
      where: { isActive: true, expiresAt: { lt: new Date() } },
      data: { isActive: false },
    });

    const accessFilter: string[] = ["PUBLIC", "GOLD_PLUS", "PLATINUM_ONLY"];

    const rooms = await (prisma as any).studyRoom.findMany({
      where: { isActive: true, isPrivate: false },
      include: {
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        participants: {
          where: { isActive: true },
          include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
        _count: { select: { participants: { where: { isActive: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const sorted = rooms.sort((a: any, b: any) => b._count.participants - a._count.participants);
    return NextResponse.json({ rooms: sorted, userPlan });
  } catch (err: any) {
    console.error("Study rooms GET hatasi:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

// POST /api/study-rooms
export async function POST(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  if (user.role === "INSTRUCTOR") {
    return NextResponse.json({ error: "Eğitmenler çalışma odası açamaz." }, { status: 403 });
  }

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { plan: true, planExpiresAt: true } });
    const userPlan = (dbUser?.planExpiresAt && dbUser.planExpiresAt > new Date()) ? (dbUser.plan ?? "FREE") : "FREE";
    const weeklyLimit = ROOM_CREATION_LIMITS[userPlan] ?? 0;

    if (weeklyLimit === 0) {
      return NextResponse.json({
        error: "Ücretsiz planda çalışma odası oluşturulamaz.",
        code: "ROOM_CREATION_NOT_ALLOWED",
        plan: userPlan,
      }, { status: 403 });
    }

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const roomsThisWeek = await (prisma as any).studyRoom.count({
      where: { createdById: user.userId, createdAt: { gte: weekStart } },
    });
    if (roomsThisWeek >= weeklyLimit) {
      return NextResponse.json({
        error: `${userPlan} planında bu hafta en fazla ${weeklyLimit} oda oluşturabilirsiniz.`,
        code: "ROOM_LIMIT_EXCEEDED",
        plan: userPlan,
        limit: weeklyLimit,
      }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, topic, type, maxCapacity, isPrivate, scheduledStart, scheduledEnd, roomAccess } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "Oda adı en az 2 karakter olmalıdır." }, { status: 400 });
    }
    if (!type || !["VOICE", "SILENT"].includes(type)) {
      return NextResponse.json({ error: "Oda tipi VOICE veya SILENT olmalıdır." }, { status: 400 });
    }

    const validAccess = ["PUBLIC", "GOLD_PLUS", "PLATINUM_ONLY"];
    const finalAccess = validAccess.includes(roomAccess) ? roomAccess : "PUBLIC";
    if (finalAccess === "GOLD_PLUS" && userPlan === "FREE") {
      return NextResponse.json({ error: "Gold ve üstü plan gerekiyor.", code: "PLAN_REQUIRED" }, { status: 403 });
    }
    if (finalAccess === "PLATINUM_ONLY" && userPlan !== "PLATINUM") {
      return NextResponse.json({ error: "Platinum plan gerekiyor.", code: "PLAN_REQUIRED" }, { status: 403 });
    }

    if (!isPrivate && (!scheduledStart || !scheduledEnd)) {
      return NextResponse.json({ error: "Genel odalar için başlangıç ve bitiş saati gereklidir." }, { status: 400 });
    }

    let dailyRoomName: string | null = null;
    if (type === "VOICE") {
      const roomName = `study-${randomBytes(4).toString("hex")}`;
      const dailyRes = await fetch(`${DAILY_API}/rooms`, {
        method: "POST",
        headers: dailyHeaders(),
        body: JSON.stringify({
          name: roomName,
          privacy: "public",
          properties: {
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
            enable_chat: false,
            enable_screenshare: true,
            lang: "tr",
          },
        }),
      });
      if (!dailyRes.ok) {
        return NextResponse.json({ error: "Daily.co oda oluşturulamadı." }, { status: 502 });
      }
      dailyRoomName = roomName;
    }

    const inviteCode = isPrivate ? randomBytes(5).toString("hex") : null;
    const expiresAt = scheduledEnd
      ? new Date(scheduledEnd)
      : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const room = await (prisma as any).studyRoom.create({
      data: {
        name: name.trim(),
        topic: topic?.trim() || null,
        type,
        createdById: user.userId,
        maxCapacity: maxCapacity || 20,
        dailyRoomName,
        expiresAt,
        isPrivate: !!isPrivate,
        inviteCode,
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
        roomAccess: finalAccess,
      },
      include: {
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        _count: { select: { participants: { where: { isActive: true } } } },
      },
    });

    return NextResponse.json({ room, inviteCode }, { status: 201 });
  } catch (err: any) {
    console.error("Study rooms POST hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
