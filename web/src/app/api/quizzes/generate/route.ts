import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth"; // Güvenlik görevlimiz!
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/quizzes/generate:
 *   post:
 *     summary: PDF dosyasından AI destekli sınav (quiz) üretir
 *     tags: [Quizzes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Yüklenecek PDF dosyası
 *               question_count:
 *                 type: integer
 *                 description: Üretilecek soru sayısı
 *                 default: 10
 *     responses:
 *       200:
 *         description: Sınav başarıyla üretildi ve kaydedildi
 *       400:
 *         description: Lütfen bir PDF dosyası yükleyin
 *       401:
 *         description: Kullanıcı doğrulanamadı
 *       502:
 *         description: Yapay zeka motoru yanıt vermedi
 *       500:
 *         description: Sunucu tarafında hata
 */
export async function POST(request: Request) {
  try {
    // 1. GÜVENLİK: İsteği atan kişi gerçekten sisteme giriş yapmış mı?
    const { user, error } = verifyToken(request);
    if (error) return error;

    // Yalnızca error objesini kontrol etmek TypeScript için user'ın kesinlikle var olduğunu garanti etmez.
    // Bu yüzden user'ın var olup olmadığını da açıkça kontrol etmemiz gerekiyor:
    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı doğrulanamadı." },
        { status: 401 },
      );
    }

    // 2. DOSYAYI YAKALAMA: Frontend'den gelen 'multipart/form-data' isteğini oku
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const questionCount = formData.get("question_count") || "10";

    if (!file) {
      return NextResponse.json(
        { error: "Lütfen bir PDF dosyası yükleyin." },
        { status: 400 },
      );
    }

    // 3. KÖPRÜYÜ KURMA: Python motoruna göndermek için yeni bir paket (FormData) hazırla
    const pythonFormData = new FormData();
    pythonFormData.append("file", file);
    pythonFormData.append("question_count", questionCount.toString());

    // 4. PYTHON'A İSTEK ATMA: Kendi iç servisimize (localhost:8000) dosyayı yolluyoruz
    console.log("Python motoruna istek atılıyor...");
    const pythonResponse = await fetch("http://127.0.0.1:8000/generate-quiz", {
      method: "POST",
      body: pythonFormData,
    });

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      console.error("Python API Hatası:", errorText);
      return NextResponse.json(
        { error: "Yapay zeka motoru yanıt vermedi." },
        { status: 502 },
      ); // 502 Bad Gateway
    }

    // 5. PYTHON'DAN GELEN VERİYİ ALMA
    const aiData = await pythonResponse.json();

    // 6. VERİTABANINA KAYIT
    const savedQuiz = await prisma.quiz.create({
      data: {
        studentId: user.userId, // Senin şemanda 'studentId' kullanılmış
        title: `${file.name} - AI Sınavı`,
        // Soruları QuizQuestion tablosuna tek seferde diziyoruz
        questions: {
          create: aiData.quiz.map((q: any) => ({
            questionText: q.question,
            options: q.options,
            correctAnswer: q.answer,
          })),
        },
      },
    });

    // 7. FRONTEND'E BAŞARIYLA DÖN
    return NextResponse.json(
      {
        message: "Sınav başarıyla üretildi ve veritabanına kaydedildi!",
        quizId: savedQuiz.id,
        data: aiData,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Entegrasyon Rotası Hatası:", err);
    return NextResponse.json(
      { error: "İşlem sırasında beklenmeyen bir hata oluştu." },
      { status: 500 },
    );
  }
}
