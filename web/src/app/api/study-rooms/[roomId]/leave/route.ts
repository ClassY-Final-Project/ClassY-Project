import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/study-rooms/[roomId]/leave
export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { roomId } = await params;

  try {
    await (prisma as any).studyRoomParticipant.updateMany({
      where: { roomId, userId: user.userId, isActive: true },
      data: { isActive: false, leftAt: new Date() },
    });

    return NextResponse.json({ message: "Odadan ayrıldınız." });
  } catch (err) {
    console.error("Study room leave hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
