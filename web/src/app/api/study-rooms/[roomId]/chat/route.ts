import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/study-rooms/[roomId]/chat — Son mesajları getir
export async function GET(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { roomId } = await params;
  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after"); // ISO timestamp

  try {
    const where: any = { roomId };
    if (after) {
      where.createdAt = { gt: new Date(after) };
    }

    const messages = await (prisma as any).studyRoomMessage.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({
      messages: messages.map((m: any) => ({
        id: m.id,
        sender: m.user.fullName || "Anonim",
        senderId: m.user.id,
        text: m.text,
        time: m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("Chat GET hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

// POST /api/study-rooms/[roomId]/chat — Mesaj gönder
export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { roomId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Mesaj boş olamaz." }, { status: 400 });
    }

    const msg = await (prisma as any).studyRoomMessage.create({
      data: {
        roomId,
        userId: user.userId,
        text: text.trim().slice(0, 500),
      },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({
      message: {
        id: msg.id,
        sender: msg.user.fullName || "Anonim",
        senderId: msg.user.id,
        text: msg.text,
        time: msg.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (err) {
    console.error("Chat POST hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
