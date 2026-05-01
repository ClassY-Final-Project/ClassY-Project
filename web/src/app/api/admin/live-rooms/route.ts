import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/admin/live-rooms — Tüm canlı dersleri listele
export async function GET(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const rooms = await prisma.liveRoom.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        instructor: { select: { id: true, fullName: true, email: true } },
        _count: { select: { participants: true } },
      },
    });

    return NextResponse.json({
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        dailyRoomName: r.dailyRoomName,
        status: r.status,
        scheduledAt: r.scheduledAt,
        startedAt: r.startedAt,
        endedAt: r.endedAt,
        createdAt: r.createdAt,
        instructor: r.instructor,
        participantCount: r._count.participants,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
