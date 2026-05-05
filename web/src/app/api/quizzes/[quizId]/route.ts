import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (!user) return NextResponse.json({ error: "Kullanıcı doğrulanamadı." }, { status: 401 });

    const { quizId } = await params;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          select: {
            id: true,
            questionText: true,
            options: true,
            userAnswer: true,
            correctAnswer: true,
          },
        },
      },
    });

    if (!quiz || quiz.studentId !== user.userId) {
      return NextResponse.json(
        { error: "Sınav bulunamadı veya görüntüleme yetkiniz yok." },
        { status: 404 },
      );
    }

    // Öğrenci quizi bitirmediyse doğru cevapları gizle
    if (quiz.score === null) {
      quiz.questions = quiz.questions.map(q => {
        const { correctAnswer, ...rest } = q;
        return rest as any;
      });
    }

    return NextResponse.json({ message: "Sınav başarıyla getirildi.", quiz }, { status: 200 });
  } catch (err: any) {
    console.error("Sınav Getirme Hatası:", err);
    return NextResponse.json({ error: "Sınav bilgileri alınırken bir hata oluştu." }, { status: 500 });
  }
}

// DELETE /api/quizzes/[quizId] — Sınavı sil (admin veya sahibi öğrenci)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (!user) return NextResponse.json({ error: "Kullanıcı doğrulanamadı." }, { status: 401 });

    const { quizId } = await params;

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      return NextResponse.json({ error: "Sınav bulunamadı." }, { status: 404 });
    }

    if (user.role !== "ADMIN" && (user.role !== "STUDENT" || quiz.studentId !== user.userId)) {
      return NextResponse.json({ error: "Bu sınavı silme yetkiniz yok." }, { status: 403 });
    }

    await prisma.quizQuestion.deleteMany({ where: { quizId } });
    await prisma.quiz.delete({ where: { id: quizId } });

    return NextResponse.json({ message: "Sınav başarıyla silindi." }, { status: 200 });
  } catch (err: any) {
    console.error("Sınav Silme Hatası:", err);
    return NextResponse.json({ error: "Sınav silinirken bir hata oluştu." }, { status: 500 });
  }
}
