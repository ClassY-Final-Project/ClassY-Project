import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const { message, targetRole } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "Mesaj boş olamaz." }, { status: 400 });
    }

    const where = targetRole && targetRole !== "ALL" ? { role: targetRole as any } : {};
    const users = await prisma.user.findMany({ where, select: { id: true } });

    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: "ANNOUNCEMENT",
        message: message.trim(),
      })),
    });

    return NextResponse.json({ message: "Duyuru gönderildi.", count: users.length });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
