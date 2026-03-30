import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/quizzes/{quizId}:
 *   get:
 *     summary: Belirli bir sınavı ve sorularını getirir
 *     tags: [Quizzes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: Getirilecek sınavın ID'si
 *     responses:
 *       200:
 *         description: Sınav başarıyla getirildi
 *       401:
 *         description: Kullanıcı doğrulanamadı
 *       404:
 *         description: Sınav bulunamadı
 *       500:
 *         description: Sunucu tarafında hata
 *   delete:
 *     summary: Belirli bir sınavı siler
 *     tags: [Quizzes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: Silinecek sınavın ID'si
 *     responses:
 *       200:
 *         description: Sınav başarıyla silindi
 *       401:
 *         description: Kullanıcı doğrulanamadı
 *       404:
 *         description: Sınav bulunamadı veya silme yetkisi yok
 *       500:
 *         description: Sunucu tarafında hata
 */

export async function GET(
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

    const quiz = await prisma.quiz.findUnique({
      where: { id: currentQuizId },
      include: {
        questions: {
          select: {
            id: true,
            questionText: true,
            options: true,
            userAnswer: true,
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

    return NextResponse.json(
      { message: "Sınav başarıyla getirildi.", quiz },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Sınav Getirme Hatası:", err);
    return NextResponse.json(
      { error: "Sınav bilgileri alınırken bir hata oluştu." },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    const quiz = await prisma.quiz.findUnique({
      where: { id: currentQuizId },
    });

    if (!quiz || quiz.studentId !== user.userId) {
      return NextResponse.json(
        { error: "Sınav bulunamadı veya silme yetkiniz yok." },
        { status: 404 },
      );
    }

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
