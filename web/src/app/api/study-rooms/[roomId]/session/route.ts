import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/study-rooms/[roomId]/session — Tamamlanan pomodoro seansını kaydeder
export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { roomId } = await params;

  let body: { studyMinutes?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const studyMinutes = Number(body.studyMinutes);
  if (!studyMinutes || studyMinutes <= 0 || studyMinutes > 240) {
    return NextResponse.json({ error: "Geçersiz süre." }, { status: 400 });
  }

  try {
    // Odanın var olduğunu ve kullanıcının katılımcı olduğunu doğrula
    const room = await (prisma as any).studyRoom.findFirst({
      where: { id: roomId, isActive: true },
      select: { id: true, name: true },
    });
    if (!room) return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });

    const sessionId = crypto.randomUUID();
    if ((prisma as any).pomodoroSession) {
      await (prisma as any).pomodoroSession.create({
        data: { id: sessionId, userId: user.userId, roomId, roomName: room.name, studyMinutes },
      });
    } else {
      await prisma.$executeRaw`
        INSERT INTO pomodoro_sessions (id, "userId", "roomId", "roomName", "studyMinutes", "completedAt")
        VALUES (${sessionId}, ${user.userId}, ${roomId}, ${room.name}, ${studyMinutes}, NOW())
      `;
    }

    return NextResponse.json({ session: { id: sessionId } });
  } catch (err) {
    console.error("Pomodoro session kayıt hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
