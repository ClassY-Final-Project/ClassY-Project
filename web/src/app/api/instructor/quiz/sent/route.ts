import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/instructor/quiz/sent — Eğitmenin gönderdiği quizleri öğrenci sonuçlarıyla getirir
export async function GET(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Sadece eğitmenler erişebilir." }, { status: 403 });
    }

    const quizzes = await prisma.quiz.findMany({
      where: { assignedByInstructorId: user.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        subject: true,
        score: true,
        createdAt: true,
        student: {
          select: { id: true, fullName: true, email: true },
        },
        questions: {
          select: {
            id: true,
            questionText: true,
            options: true,
            correctAnswer: true,
            userAnswer: true,
          },
        },
      },
    });

    // Her quiz kaydı tek bir öğrenciye aittir (assign endpoint her öğrenci için ayrı kayıt oluşturur)
    // Aynı başlıktaki quizleri grupla (eğitmen aynı quizi birden fazla öğrenciye gönderebilir)
    const grouped: Record<string, {
      title: string;
      subject: string;
      createdAt: string;
      students: {
        quizId: string;
        student: { id: string; fullName: string | null; email: string };
        score: number | null;
        completed: boolean;
        wrongQuestions: { questionText: string; correctAnswer: string; userAnswer: string | null }[];
      }[];
    }> = {};

    for (const quiz of quizzes) {
      // Gruplama anahtarı: başlık + createdAt (aynı batch)
      // Birden fazla öğrenciye gönderilen quizlerde createdAt milisaniyeler içinde farklı olabilir.
      // title bazlı gruplamak daha güvenilir.
      const key = quiz.title;

      if (!grouped[key]) {
        grouped[key] = {
          title: quiz.title,
          subject: quiz.subject,
          createdAt: quiz.createdAt.toISOString(),
          students: [],
        };
      }

      const wrongQuestions = quiz.questions
        .filter((q) => q.userAnswer !== null && q.userAnswer !== q.correctAnswer)
        .map((q) => ({
          questionText: q.questionText,
          correctAnswer: q.correctAnswer,
          userAnswer: q.userAnswer,
        }));

      grouped[key].students.push({
        quizId: quiz.id,
        student: quiz.student,
        score: quiz.score,
        completed: quiz.score !== null,
        wrongQuestions,
      });
    }

    return NextResponse.json({ quizGroups: Object.values(grouped) });
  } catch (err: any) {
    console.error("Gönderilen Quizler Hatası:", err);
    return NextResponse.json({ error: "Quizler yüklenemedi." }, { status: 500 });
  }
}
