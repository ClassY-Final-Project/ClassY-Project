import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

type Ctx = { params: Promise<{ notificationId: string }> };

export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;

    const { notificationId } = await params;

    const existing = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Bildirim bulunamadı." }, { status: 404 });
    }

    // Check if the user owns this notification
    if (existing.userId !== user?.userId && user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Bu işlemi yapmaya yetkiniz yok." }, { status: 403 });
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return NextResponse.json({ success: true, message: "Bildirim başarıyla silindi." });
  } catch (err) {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
