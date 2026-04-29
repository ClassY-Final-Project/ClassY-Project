import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (!user) return NextResponse.json({ error: "Kullanıcı doğrulanamadı." }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const questionCount = formData.get("question_count") || "10";
    const subjectOverride = (formData.get("subject_override") as string | null) || null;

    if (!file) {
      return NextResponse.json({ error: "Lütfen bir PDF dosyası yükleyin." }, { status: 400 });
    }

    const pythonFormData = new FormData();
    pythonFormData.append("file", file);
    pythonFormData.append("question_count", questionCount.toString());

    const pythonResponse = await fetch("http://127.0.0.1:8000/generate-quiz", {
      method: "POST",
      body: pythonFormData,
    });

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      console.error("Python API Hatası:", errorText);
      let detail = "Yapay zeka motoru yanıt vermedi.";
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.detail) detail = parsed.detail;
      } catch {}
      return NextResponse.json({ error: detail }, { status: 502 });
    }

    const aiData = await pythonResponse.json();
    const subject = subjectOverride || aiData.subject || "Genel";

    const savedQuiz = await prisma.quiz.create({
      data: {
        studentId: user.userId,
        title: `${file.name} - AI Sınavı`,
        subject: subject,
        questions: {
          create: aiData.quiz.map((q: any) => ({
            questionText: q.question,
            options: q.options,
            correctAnswer: q.answer,
          })),
        },
      },
    });

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
    return NextResponse.json({ error: "İşlem sırasında beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
