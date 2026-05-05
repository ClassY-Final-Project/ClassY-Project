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

// GET /api/study-rooms — Aktif genel odaları listele (en çok katılımcı önce)
export async function GET(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  try {
    // Süresi geçmiş odaları otomatik kapat
    await (prisma as any).studyRoom.updateMany({
      where: { isActive: true, expiresAt: { lt: new Date() } },
      data: { isActive: false },
    });

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

    const sorted = rooms.sort(
      (a: any, b: any) => b._count.participants - a._count.participants
    );

    return NextResponse.json({ rooms: sorted });
  } catch (err: any) {
    console.error("Study rooms GET hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

// POST /api/study-rooms — Yeni oda oluştur
export async function POST(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  if (user.role === "INSTRUCTOR") {
    return NextResponse.json({ error: "Eğitmenler çalışma odası açamaz." }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { name, topic, type, maxCapacity, isPrivate, scheduledStart, scheduledEnd } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "Oda adı en az 2 karakter olmalıdır." }, { status: 400 });
    }
    if (!type || !["VOICE", "SILENT"].includes(type)) {
      return NextResponse.json({ error: "Oda tipi VOICE veya SILENT olmalıdır." }, { status: 400 });
    }

    // Genel oda için zaman aralığı zorunlu
    if (!isPrivate && (!scheduledStart || !scheduledEnd)) {
      return NextResponse.json({ error: "Genel odalar için başlangıç ve bitiş saati gereklidir." }, { status: 400 });
    }

    let dailyRoomName: string | null = null;
    if (type === "VOICE") {
      const roomName = `study-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const dailyRes = await fetch(`${DAILY_API}/rooms`, {
        method: "POST",
        headers: dailyHeaders(),
        body: JSON.stringify({
          name: roomName,
          privacy: "public",
          properties: {
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
            enable_chat: true,
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
      : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 gün

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
