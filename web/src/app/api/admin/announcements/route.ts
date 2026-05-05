import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    // Gruplayarak eşsiz duyuru mesajlarını getir
    const announcements = await prisma.notification.groupBy({
      by: ['message', 'createdAt'],
      where: { type: "ANNOUNCEMENT" },
      _count: { userId: true },
      orderBy: { createdAt: "desc" }
    });

    // Remove duplicates manually in case of different creation times
    const uniqueMap = new Map();
    announcements.forEach(a => {
      if (!uniqueMap.has(a.message)) {
        uniqueMap.set(a.message, {
          message: a.message,
          createdAt: a.createdAt,
          count: a._count.userId
        });
      } else {
        uniqueMap.get(a.message).count += a._count.userId;
      }
    });

    return NextResponse.json({ announcements: Array.from(uniqueMap.values()) });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

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

export async function DELETE(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const message = searchParams.get("message");

    if (!message) {
      return NextResponse.json({ error: "Silinecek mesaj belirtilmedi." }, { status: 400 });
    }

    const deleted = await prisma.notification.deleteMany({
      where: {
        type: "ANNOUNCEMENT",
        message: message
      }
    });

    return NextResponse.json({ success: true, count: deleted.count, message: "Duyuru silindi." });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
