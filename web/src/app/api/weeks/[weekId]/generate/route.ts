import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PDF_LIMITS: Record<string, number> = { FREE: 1, GOLD: 5, PLATINUM: 10 };

// POST /api/weeks/[weekId]/generate
// PDF yükler, hem özet+flashcard hem quiz üretir, hepsini haftaya bağlar.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

    const { weekId } = await params;

    const week = await prisma.week.findUnique({
      where: { id: weekId },
      include: { subject: true },
    });
    if (!week || week.subject.studentId !== user.userId) {
      return NextResponse.json({ error: "Hafta bulunamadı." }, { status: 404 });
    }

    // Plan bazlı PDF limit kontrolü
    const dbUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { plan: true, planExpiresAt: true } });
    const plan = (dbUser?.planExpiresAt && dbUser.planExpiresAt > new Date()) ? (dbUser.plan ?? "FREE") : "FREE";
    const pdfLimit = PDF_LIMITS[plan] ?? 1;

    // Bu haftaya kaç not yüklenmiş?
    const weekNoteCount = await prisma.studyNote.count({ where: { weekId } });
    if (weekNoteCount >= pdfLimit) {
      // Plan adını Türkçeleştir
      const planLabel = plan === "FREE" ? "Ücretsiz" : plan === "GOLD" ? "Gold" : plan === "PLATINUM" ? "Platinum" : plan;
      return NextResponse.json({
        error: `${planLabel} planında her hafta en fazla ${pdfLimit} PDF yükleyebilirsiniz.`,
        code: "PDF_LIMIT_EXCEEDED",
        plan,
        limit: pdfLimit,
      }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const questionCount = Number(formData.get("question_count") || 10);

    if (!file) {
      return NextResponse.json({ error: "PDF gerekli." }, { status: 400 });
    }

    // Aynı dosyayı iki ayrı endpointe paralel gönder
    const fileBuffer = await file.arrayBuffer();

    const buildForm = (extra?: Record<string, string>) => {
      const fd = new FormData();
      fd.append("file", new Blob([fileBuffer], { type: file.type || "application/pdf" }), file.name);
      if (extra) Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
      return fd;
    };

    const PYTHON_BASE = "http://127.0.0.1:8000";

    // Önce notları üret, ardından quiz — paralel istek Gemini 503 hatasına yol açıyor
    const notesRes = await fetch(`${PYTHON_BASE}/generate-study-notes`, {
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
          { status: 422 }
        );
      }
      return NextResponse.json({ error: "Çalışma notları üretilemedi." }, { status: 502 });
    }

    // Quiz her zaman tam 10 soru üretir
    const quizRes = await fetch(`${PYTHON_BASE}/generate-quiz`, {
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

    // 1) StudyNote oluştur
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

    // 2) Quiz oluştur
    const quiz = await prisma.quiz.create({
      data: {
        studentId: user.userId,
        title: `${file.name} - Quiz`,
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
