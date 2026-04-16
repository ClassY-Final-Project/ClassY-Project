import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/instructor/quiz/assign — Eğitmen seçili öğrencilere quiz atar
export async function POST(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Sadece eğitmenler quiz atayabilir." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { title, questions, studentIds } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Quiz başlığı gereklidir." }, { status: 400 });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "En az bir soru ekleyin." }, { status: 400 });
    }
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: "En az bir öğrenci seçin." }, { status: 400 });
    }

    // Her öğrenci için ayrı Quiz kaydı oluştur
    const created = await Promise.all(
      studentIds.map((studentId: string) =>
        prisma.quiz.create({
          data: {
            title: title.trim(),
            subject: "Eğitmen Quizi",
            studentId,
            assignedByInstructorId: user.userId,
            questions: {
              create: questions.map((q: any) => ({
                questionText: q.question,
                options: q.options,
                correctAnswer: q.answer,
              })),
            },
          },
        })
      )
    );

    return NextResponse.json({
      message: `Quiz ${created.length} öğrenciye başarıyla atandı.`,
      count: created.length,
    });
  } catch (err: any) {
    console.error("Quiz Atama Hatası:", err);
    return NextResponse.json({ error: "Quiz atanırken hata oluştu." }, { status: 500 });
  }
}
