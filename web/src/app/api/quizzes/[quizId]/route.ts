import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;

    const { quizId } = await params;

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      return NextResponse.json({ error: "Quiz bulunamadı." }, { status: 404 });
    }

    if (user?.role !== "ADMIN" && (user?.role !== "STUDENT" || quiz.studentId !== user.userId)) {
      return NextResponse.json({ error: "Yetkisiz erişim. Bu quizi silme yetkiniz yok." }, { status: 403 });
    }

    // İlk olarak quize ait soruları siliyoruz (Prisma'da on cascade delete ayarlanmadıysa)
    await prisma.quizQuestion.deleteMany({ where: { quizId } });
    await prisma.quiz.delete({ where: { id: quizId } });

    return NextResponse.json({ message: "Quiz başarıyla silindi." });
  } catch (err) {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
