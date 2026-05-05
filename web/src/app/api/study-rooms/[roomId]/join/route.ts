import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/study-rooms/[roomId]/join
export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { roomId } = await params;

  try {
    const room = await (prisma as any).studyRoom.findUnique({
      where: { id: roomId },
      include: { _count: { select: { participants: { where: { isActive: true } } } } },
    });

    if (!room) return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    if (!room.isActive) return NextResponse.json({ error: "Bu oda kapatılmış." }, { status: 400 });
    if (room._count.participants >= room.maxCapacity) {
      return NextResponse.json({ error: "Oda dolu." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { studying } = body;

    // Daha önce katılmışsa kaydı güncelle, yoksa yeni oluştur
    const existing = await (prisma as any).studyRoomParticipant.findUnique({
      where: { roomId_userId: { roomId: roomId, userId: user.userId } },
    });

    if (existing) {
      await (prisma as any).studyRoomParticipant.update({
        where: { roomId_userId: { roomId: roomId, userId: user.userId } },
        data: { isActive: true, leftAt: null, studying: studying || existing.studying, joinedAt: new Date() },
      });
    } else {
      await (prisma as any).studyRoomParticipant.create({
        data: {
          roomId: roomId,
          userId: user.userId,
          studying: studying || null,
          isActive: true,
        },
      });
    }

    return NextResponse.json({ message: "Odaya katıldınız." });
  } catch (err) {
    console.error("Study room join hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
