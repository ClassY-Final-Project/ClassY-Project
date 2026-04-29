import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

type Ctx = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const { userId } = await params;
    const { role } = await request.json();

    if (!["STUDENT", "INSTRUCTOR", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Geçersiz rol." }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, fullName: true, role: true },
    });

    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const { userId } = await params;

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ message: "Kullanıcı başarıyla silindi." });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
