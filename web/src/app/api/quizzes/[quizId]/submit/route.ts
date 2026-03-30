import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/quizzes/{quizId}/submit:
 *   post:
 *     summary: Sınav cevaplarını gönderir ve puanı hesaplar
 *     tags: [Quizzes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: Gönderilecek sınavın ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answers
 *             properties:
 *               answers:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 description: "{ 'question_id': 'A' } şeklinde sadece şık harfi veya tam metin gönderilebilir"
 *                 example:
 *                   question-uuid-1: "A"
 *                   question-uuid-2: "C"
 *     responses:
 *       200:
 *         description: Sınav başarıyla tamamlandı, puan döndürüldü
 *       401:
 *         description: Kullanıcı doğrulanamadı
 *       404:
 *         description: Sınav bulunamadı veya yetkiniz yok
 *       500:
 *         description: Sunucu tarafında hata
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
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

    const resolvedParams = await params;
    const currentQuizId = resolvedParams.quizId;

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
      if (!studentAnswer) continue;

      let isCorrect = false;
      const correctAnswer = question.correctAnswer as string;

      if (studentAnswer === correctAnswer) {
        isCorrect = true;
      } else if (studentAnswer.length === 1 || studentAnswer.length === 2) {
        const letter = studentAnswer.charAt(0).toUpperCase();
        const letterToIndex: Record<string, number> = {
          A: 0,
          B: 1,
          C: 2,
          D: 3,
          E: 4,
        };
        const index = letterToIndex[letter];

        if (index !== undefined) {
          if (
            correctAnswer.startsWith(`${letter})`) ||
            correctAnswer.startsWith(`${letter}.`) ||
            correctAnswer.startsWith(`${letter} `)
          ) {
            isCorrect = true;
          } else {
            const optionsArray = question.options as string[];
            if (
              Array.isArray(optionsArray) &&
              optionsArray[index] === correctAnswer
            ) {
              isCorrect = true;
            }
          }
        }
      }

      if (isCorrect) {
        correctCount++;
      }

      await prisma.quizQuestion.update({
        where: { id: question.id },
        data: { userAnswer: studentAnswer },
      });
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
