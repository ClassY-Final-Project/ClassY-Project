import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { quizId: string } },
) {
  try {
    // 1. Güvenlik Kontrolü
    const { user, error } = verifyToken(request);
    if (error) return error;

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı doğrulanamadı." },
        { status: 401 },
      );
    }

    const currentQuizId = params.quizId;

    // 2. Sınav gerçekten var mı ve bu öğrenciye mi ait?
    const quiz = await prisma.quiz.findUnique({
      where: { id: currentQuizId },
    });

    if (!quiz || quiz.studentId !== user.userId) {
      return NextResponse.json(
        { error: "Sınav bulunamadı veya silme yetkiniz yok." },
        { status: 404 },
      );
    }

    // 3. Sınavı Sil (Cascade sayesinde bağlı 'QuizQuestion'lar da silinecek)
    await prisma.quiz.delete({
      where: { id: currentQuizId },
    });

    return NextResponse.json(
      { message: "Sınav başarıyla silindi." },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Sınav Silme Hatası:", err);
    return NextResponse.json(
      { error: "Sınav silinirken bir hata oluştu." },
      { status: 500 },
    );
  }
}
