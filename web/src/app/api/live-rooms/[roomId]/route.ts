import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/live-rooms/[roomId] — Oda detayı
export async function GET(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { roomId } = await params;

  try {
    const room = await (prisma as any).liveRoom.findUnique({
      where: { id: roomId },
      include: {
        instructor: { select: { id: true, fullName: true, email: true } },
        _count: { select: { participants: true } },
      },
    });
    if (!room) return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    return NextResponse.json({ room });
  } catch (err) {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

// DELETE /api/live-rooms/[roomId] — Oda sil (admin veya oda sahibi eğitmen)
export async function DELETE(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { roomId } = await params;

  try {
    const room = await (prisma as any).liveRoom.findUnique({ where: { id: roomId } });
    if (!room) return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });

    if (user.role !== "ADMIN" && (user.role !== "INSTRUCTOR" || room.instructorId !== user.userId)) {
      return NextResponse.json({ error: "Yetkisiz erişim. Bu odayı silme yetkiniz yok." }, { status: 403 });
    }

    await (prisma as any).liveRoom.delete({ where: { id: roomId } });
    return NextResponse.json({ message: "Oda silindi." });
  } catch (err) {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
