import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /notes/generate:
 *   post:
 *     summary: PDF dosyasından özet ve çalışma kartları (flashcard) üretir
 *     tags: [Notes]
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
 *     responses:
 *       200:
 *         description: Not ve kartlar başarıyla üretildi ve veritabanına kaydedildi
 *       400:
 *         description: Dosya eksik veya geçersiz
 *       401:
 *         description: Yetkisiz erişim
 *       502:
 *         description: Python AI motoru yanıt vermedi
 *       500:
 *         description: Sunucu tarafında hata
 */
export async function POST(request: Request) {
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

    // 2. Dosyayı Yakala
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Lütfen bir PDF dosyası yükleyin." },
        { status: 400 },
      );
    }

    // 3. Python Motoruna Gönder
    console.log("Python motoruna özet ve flashcard için istek atılıyor...");
    const pythonFormData = new FormData();
    pythonFormData.append("file", file);

    const pythonResponse = await fetch(
      "http://127.0.0.1:8000/generate-study-notes",
      {
        method: "POST",
        body: pythonFormData,
      },
    );

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      console.error("Python API Hatası:", errorText);
      return NextResponse.json(
        { error: "Yapay zeka motoru yanıt vermedi." },
        { status: 502 },
      );
    }

    // 4. Python'dan Gelen JSON'ı Al
    // Hatırlatma: Python bize { status: "success", data: { summary: "...", flashcards: [...] } } dönüyor
    const aiData = await pythonResponse.json();
    const { summary, flashcards } = aiData.data;

    // 5. Veritabanına Tek Seferde Kaydet (Nested Write)
    const savedNote = await prisma.studyNote.create({
      data: {
        studentId: user.userId,
        fileName: file.name,
        summary: summary,
        processedStatus: "COMPLETED", // İşlem bittiği için durumu tamamlandı yapıyoruz

        // Flashcard tablosuna kartları tek seferde diziyoruz
        flashcards: {
          create: flashcards.map((card: any) => ({
            front: card.front,
            back: card.back,
          })),
        },
      },
    });

    // 6. Başarıyla Dön
    return NextResponse.json(
      {
        message: "Özet ve çalışma kartları başarıyla üretilip kaydedildi!",
        noteId: savedNote.id,
        data: aiData.data,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Not Üretim Entegrasyon Hatası:", err);
    return NextResponse.json(
      { error: "İşlem sırasında beklenmeyen bir hata oluştu." },
      { status: 500 },
    );
  }
}
