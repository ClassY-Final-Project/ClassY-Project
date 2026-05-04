import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const [notesRes, quizRes] = await Promise.all([
      fetch(`${PYTHON_BASE}/generate-study-notes`, { method: "POST", body: buildForm() }),
      fetch(`${PYTHON_BASE}/generate-quiz`, {
        method: "POST",
        body: buildForm({ question_count: String(questionCount) }),
      }),
    ]);

    if (!notesRes.ok || !quizRes.ok) {
      const errText = !notesRes.ok ? await notesRes.text() : await quizRes.text();
      console.error("AI motor hatası:", errText);
      return NextResponse.json(
        { error: "Yapay zeka motoru yanıt vermedi." },
        { status: 502 }
      );
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
