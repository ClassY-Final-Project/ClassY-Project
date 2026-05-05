import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/admin/study-rooms/[roomId] — Odayı zorla kapat
export async function DELETE(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const { roomId } = await params;

  try {
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
    console.error("Admin study room DELETE hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
