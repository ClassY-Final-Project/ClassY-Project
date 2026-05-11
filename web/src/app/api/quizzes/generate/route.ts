import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (!user)
      return NextResponse.json(
        { error: "Kullanıcı doğrulanamadı." },
        { status: 401 },
      );

    // 1. Global PDF ve Plan Limiti Kontrolü
    const PDF_LIMITS: Record<string, number> = {
      FREE: 3,
      GOLD: 8,
      PLATINUM: 20,
    };
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { plan: true, planExpiresAt: true },
    });

    const currentPlan =
      dbUser?.planExpiresAt && dbUser.planExpiresAt > new Date()
        ? (dbUser.plan ?? "FREE")
        : "FREE";
    const pdfLimit = PDF_LIMITS[currentPlan] ?? 3;

    const totalNotes = await prisma.studyNote.count({
      where: { studentId: user.userId },
    });
    const totalStandaloneQuizzes = await prisma.quiz.count({
      where: { studentId: user.userId, noteId: null },
    });
    const totalUsage = totalNotes + totalStandaloneQuizzes;

    if (totalUsage >= pdfLimit) {
      const planLabel =
        currentPlan === "FREE"
          ? "Ücretsiz"
          : currentPlan === "GOLD"
            ? "Gold"
            : "Platinum";
      return NextResponse.json(
        {
          error: `Limit aşıldı! ${planLabel} planında toplam en fazla ${pdfLimit} PDF yükleyebilirsiniz.`,
          code: "PDF_LIMIT_EXCEEDED",
        },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const questionCount = formData.get("question_count") || "10";
    const subjectOverride =
      (formData.get("subject_override") as string | null) || null;

    if (!file) {
      return NextResponse.json(
        { error: "Lütfen bir PDF dosyası yükleyin." },
        { status: 400 },
      );
    }

    const pythonFormData = new FormData();
    pythonFormData.append("file", file);
    pythonFormData.append("question_count", questionCount.toString());

    const AI_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";

    const pythonResponse = await fetch(`${AI_URL}/generate-quiz`, {
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
    return NextResponse.json(
      { error: "İşlem sırasında beklenmeyen bir hata oluştu." },
      { status: 500 },
    );
  }
}
