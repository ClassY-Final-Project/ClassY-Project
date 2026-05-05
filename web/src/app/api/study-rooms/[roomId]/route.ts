import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/study-rooms/[roomId] — Oda detayı
export async function GET(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { roomId } = await params;

  try {
    const room = await (prisma as any).studyRoom.findUnique({
      where: { id: roomId },
      include: {
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        participants: {
          where: { isActive: true },
          include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
          orderBy: { joinedAt: "asc" },
        },
        _count: { select: { participants: { where: { isActive: true } } } },
      },
    });

    if (!room) return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });

    return NextResponse.json({ room });
  } catch (err) {
    console.error("Study room GET hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

// DELETE /api/study-rooms/[roomId] — Odayı kapat (oda sahibi veya admin)
export async function DELETE(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { roomId } = await params;

  try {
    const room = await (prisma as any).studyRoom.findUnique({ where: { id: roomId } });
    if (!room) return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });

    if (room.createdById !== user.userId && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Bu odayı kapatma yetkiniz yok." }, { status: 403 });
    }

    await (prisma as any).studyRoomParticipant.updateMany({
      where: { roomId, isActive: true },
      data: { isActive: false, leftAt: new Date() },
    });

    await (prisma as any).studyRoom.update({
      where: { id: roomId },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Oda kapatıldı." });
  } catch (err) {
    console.error("Study room DELETE hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
