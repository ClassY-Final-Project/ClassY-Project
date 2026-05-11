import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ weekId: string }> },
) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (!user)
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

    const { weekId } = await params;

    const week = await prisma.week.findUnique({
      where: { id: weekId },
      include: { subject: true },
    });
    if (!week || week.subject.studentId !== user.userId) {
      return NextResponse.json({ error: "Hafta bulunamadı." }, { status: 404 });
    }

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

    // Öğrencinin sistemdeki TOPLAM pdf/içerik üretim sayısını bul (Notlar + Tekil Sınavlar)
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
          error: `Limit aşıldı! ${planLabel} planında toplam en fazla ${pdfLimit} PDF/İçerik yükleyebilirsiniz. Sınırı kaldırmak için planınızı yükseltin.`,
          code: "PDF_LIMIT_EXCEEDED",
          plan: currentPlan,
          limit: pdfLimit,
        },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "PDF gerekli." }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();

    const buildForm = (extra?: Record<string, string>) => {
      const fd = new FormData();
      fd.append(
        "file",
        new Blob([fileBuffer], { type: file.type || "application/pdf" }),
        file.name,
      );
      if (extra) Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
      return fd;
    };

    // Vercel / Render Uyumluluğu: URL'i .env'den al, yoksa locale düş
    const AI_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";

    const notesRes = await fetch(`${AI_URL}/generate-study-notes`, {
      method: "POST",
      body: buildForm(),
    });

    // Helper: AI motorundan gelen hatayı (özellikle 422 INAPPROPRIATE_CONTENT) parse et
    const parseAiError = async (
      res: Response
    ): Promise<{ code?: string; message?: string; raw: string }> => {
      const raw = await res.text();
      try {
        const parsed = JSON.parse(raw);
        const detail = parsed?.detail;
        if (detail && typeof detail === "object") {
          return { code: detail.code, message: detail.message, raw };
        }
        if (typeof detail === "string") {
          return { message: detail, raw };
        }
      } catch {
        /* JSON değilse aşağıda raw kullanılır */
      }
      return { raw };
    };

    if (!notesRes.ok) {
      const aiErr = await parseAiError(notesRes);
      console.error("AI motor hatası (notlar):", aiErr.raw);
      if (notesRes.status === 422 && aiErr.code === "INAPPROPRIATE_CONTENT") {
        return NextResponse.json(
          {
            error:
              aiErr.message ||
              "Yüklediğiniz PDF uygunsuz veya eğitimle ilgisiz içerik barındırıyor.",
            code: "INAPPROPRIATE_CONTENT",
          },
          { status: 422 },
        );
      }
      return NextResponse.json(
        { error: "Çalışma notları üretilemedi." },
        { status: 502 },
      );
    }

    const quizRes = await fetch(`${AI_URL}/generate-quiz`, {
      method: "POST",
      body: buildForm({ question_count: "10" }),
    });

    if (!quizRes.ok) {
      const aiErr = await parseAiError(quizRes);
      console.error("AI motor hatası (quiz):", aiErr.raw);
      if (quizRes.status === 422 && aiErr.code === "INAPPROPRIATE_CONTENT") {
        return NextResponse.json(
          {
            error:
              aiErr.message ||
              "Yüklediğiniz PDF uygunsuz veya eğitimle ilgisiz içerik barındırıyor.",
            code: "INAPPROPRIATE_CONTENT",
          },
          { status: 422 }
        );
      }
      return NextResponse.json({ error: "Quiz üretilemedi." }, { status: 502 });
    }

    const notesData = await notesRes.json();
    const quizData = await quizRes.json();

    const summary = notesData.data?.summary || "";
    const flashcards = notesData.data?.flashcards || [];
    const quizItems = quizData.quiz || [];
    const subjectName = week.subject.name;

    const note = await prisma.studyNote.create({
      data: {
        studentId: user.userId,
        fileName: file.name,
        summary,
        subject: subjectName,
        processedStatus: "COMPLETED",
        weekId: week.id,
        flashcards: {
          create: flashcards.map((c: any) => ({
            front: c.front,
            back: c.back,
            subject: subjectName,
          })),
        },
      },
    });

    const quiz = await prisma.quiz.create({
      data: {
        studentId: user.userId,
        title: `${file.name} - Sınav`,
        subject: subjectName,
        weekId: week.id,
        noteId: note.id,
        questions: {
          create: quizItems.map((q: any) => ({
            questionText: q.question,
            options: q.options,
            correctAnswer: q.answer,
          })),
        },
      },
    });

    return NextResponse.json({
      noteId: note.id,
      quizId: quiz.id,
      summary,
      flashcards,
      quiz: quizItems,
    });
  } catch (err: any) {
    console.error("Hafta üretim hatası:", err);
    return NextResponse.json({ error: "İşlem başarısız." }, { status: 500 });
  }
}
