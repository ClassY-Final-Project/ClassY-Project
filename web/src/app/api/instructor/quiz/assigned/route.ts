import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/instructor/quiz/assigned — Öğrenciye eğitmen tarafından atanan quizleri getirir
export async function GET(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

    const quizzes = await prisma.quiz.findMany({
      where: {
        studentId: user.userId,
        assignedByInstructorId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        subject: true,
        score: true,
        createdAt: true,
        assignedByInstructor: {
          select: { fullName: true, email: true },
        },
      },
    });

    const result = quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      subject: q.subject,
      score: q.score,
      createdAt: q.createdAt,
      instructor: q.assignedByInstructor ?? { fullName: null, email: "" },
    }));

    return NextResponse.json({ quizzes: result });
  } catch (err: any) {
    console.error("Atanan Quizler Hatası:", err);
    return NextResponse.json({ error: "Quizler yüklenemedi." }, { status: 500 });
  }
}
