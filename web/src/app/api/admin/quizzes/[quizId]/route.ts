import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

type Ctx = { params: Promise<{ quizId: string }> };

// DELETE /api/admin/quizzes/[quizId] — Quiz sil
export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const { quizId } = await params;

    const existing = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!existing) {
      return NextResponse.json({ error: "Quiz bulunamadı." }, { status: 404 });
    }

    await prisma.quiz.delete({ where: { id: quizId } });
    return NextResponse.json({ message: "Quiz silindi." });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
