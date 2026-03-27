import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 1. DEĞİŞİKLİK: params objesinin içindeki değişkenin tipini 'quizId' olarak güncelledik
export async function POST(
  request: Request,
  { params }: { params: { quizId: string } },
) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı doğrulanamadı." },
        { status: 401 },
      );
    }

    // 2. DEĞİŞİKLİK: Artık params.id değil, klasörüne verdiğin isim olan params.quizId'yi çekiyoruz
    const currentQuizId = params.quizId;

    const body = await request.json();
    const { answers } = body;

    const quiz = await prisma.quiz.findUnique({
      where: { id: currentQuizId },
      include: { questions: true },
    });

    if (!quiz || quiz.studentId !== user.userId) {
      return NextResponse.json(
        { error: "Sınav bulunamadı veya yetkiniz yok." },
        { status: 404 },
      );
    }

    let correctCount = 0;
    const totalQuestions = quiz.questions.length;

    for (const question of quiz.questions) {
      const studentAnswer = answers[question.id];

      if (studentAnswer === question.correctAnswer) {
        correctCount++;
      }

      if (studentAnswer) {
        await prisma.quizQuestion.update({
          where: { id: question.id },
          data: { userAnswer: studentAnswer },
        });
      }
    }

    const finalScore = Math.round((correctCount / totalQuestions) * 100);

    await prisma.quiz.update({
      where: { id: currentQuizId },
      data: { score: finalScore },
    });

    return NextResponse.json(
      {
        message: "Sınav başarıyla tamamlandı!",
        score: finalScore,
        correctCount: correctCount,
        totalQuestions: totalQuestions,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Sınav Submit Hatası:", err);
    return NextResponse.json(
      { error: "Sınav kaydedilirken bir hata oluştu." },
      { status: 500 },
    );
  }
}
