import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/instructor/quiz/stats — Eğitmenin gönderdiği quizler + öğrenci sonuçları
export async function GET(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (user!.role === "STUDENT") return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const quizzes = await prisma.quiz.findMany({
    where: { assignedByInstructorId: user!.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      subject: true,
      score: true,
      createdAt: true,
      student: { select: { id: true, fullName: true, email: true } },
      questions: { select: { id: true, questionText: true, correctAnswer: true, userAnswer: true } },
    },
  });

  // Başlık bazlı grupla (aynı quiz farklı öğrencilere gönderilmiş olabilir)
  const grouped: Record<string, {
    id: string;
    title: string;
    subject: string;
    createdAt: string;
    questions: { id: string }[];
    results: {
      studentId: string;
      studentName: string | null;
      studentEmail: string;
      score: number | null;
      completedAt: string | null;
    }[];
  }> = {};

  for (const q of quizzes) {
    if (!grouped[q.title]) {
      grouped[q.title] = {
        id: q.id,
        title: q.title,
        subject: q.subject,
        createdAt: q.createdAt.toISOString(),
        questions: q.questions.map((x) => ({ id: x.id })),
        results: [],
      };
    }
    grouped[q.title].results.push({
      studentId: q.student.id,
      studentName: q.student.fullName,
      studentEmail: q.student.email,
      score: q.score,
      completedAt: q.score !== null ? q.createdAt.toISOString() : null,
    });
  }

  return NextResponse.json({ quizzes: Object.values(grouped) });
}
