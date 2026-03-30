import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /quizzes/{quizId}:
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

    // AWAIT EKLENDİ
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
