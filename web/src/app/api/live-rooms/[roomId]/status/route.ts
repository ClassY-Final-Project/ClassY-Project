import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/live-rooms/[roomId]/status — Oda durumunu döner
export async function GET(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { roomId } = await params;

  try {
    const room = await (prisma as any).liveRoom.findUnique({
      where: { id: roomId },
      select: { id: true, status: true, endedAt: true },
    });
    if (!room) return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    return NextResponse.json({ status: room.status, endedAt: room.endedAt });
  } catch (err) {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
