import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/study-rooms/invite/[code] — Davet koduyla oda bilgisini getir
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { code } = await params;

  try {
    const room = await (prisma as any).studyRoom.findUnique({
      where: { inviteCode: code },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { participants: { where: { isActive: true } } } },
      },
    });

    if (!room || !room.isActive) {
      return NextResponse.json({ error: "Geçersiz veya süresi dolmuş davet linki." }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (err) {
    console.error("Invite GET hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
