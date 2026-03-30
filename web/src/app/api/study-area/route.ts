import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/study-area:
 *   get:
 *     summary: Öğrencinin çalışma alanını (notları ve quizleri) getirir
 *     tags: [Study Area]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Çalışma alanı verileri başarıyla getirildi
 *       401:
 *         description: Yetkisiz erişim
 *       500:
 *         description: Sunucu tarafında hata
 */
export async function GET(request: Request) {
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

    // 2. Kullanıcının tüm notlarını ve sınavlarını en yeniden eskiye doğru çek
    const [notes, quizzes] = await Promise.all([
      prisma.studyNote.findMany({
        where: { studentId: user.userId },
        orderBy: { uploadedAt: "desc" },
        select: {
          id: true,
          fileName: true,
          subject: true,
          processedStatus: true,
          uploadedAt: true,
          // Özeti çok uzun olabileceği için listelemede sadece ID ve başlıkları çekiyoruz,
          // İçine girince detayını ayrı çekeriz.
        },
      }),
      prisma.quiz.findMany({
        where: { studentId: user.userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          subject: true,
          score: true,
          createdAt: true,
        },
      }),
    ]);

    // 3. Verileri "Ders" (Subject) bazında grupla
    // Frontend'in kolayca haritalayabileceği (map) bir yapı kuruyoruz
    const groupedBySubject: Record<string, { notes: any[]; quizzes: any[] }> =
      {};

    // Notları derslerine göre dağıt
    notes.forEach((note) => {
      if (!groupedBySubject[note.subject]) {
        groupedBySubject[note.subject] = { notes: [], quizzes: [] };
      }
      groupedBySubject[note.subject].notes.push(note);
    });

    // Sınavları derslerine göre dağıt
    quizzes.forEach((quiz) => {
      if (!groupedBySubject[quiz.subject]) {
        groupedBySubject[quiz.subject] = { notes: [], quizzes: [] };
      }
      groupedBySubject[quiz.subject].quizzes.push(quiz);
    });

    // 4. Objeyi Diziye (Array) çevir (Frontend'de map ile dönmek için dizi şarttır)
    const studyAreaDashboard = Object.keys(groupedBySubject).map(
      (subjectName) => ({
        subject: subjectName,
        items: groupedBySubject[subjectName],
      }),
    );

    // 5. Frontend'e gönder
    return NextResponse.json(
      {
        message: "Çalışma alanı başarıyla yüklendi.",
        dashboard: studyAreaDashboard,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Çalışma Alanı Listeleme Hatası:", err);
    return NextResponse.json(
      { error: "Veriler yüklenirken bir hata oluştu." },
      { status: 500 },
    );
  }
}
