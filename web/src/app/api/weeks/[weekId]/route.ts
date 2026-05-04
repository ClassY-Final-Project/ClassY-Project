import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/weeks/[weekId] — Haftanın PDF/notlarını ve quizlerini listele
export async function GET(
  request: Request,
  { params }: { params: Promise<{ weekId: string }> }
) {
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

  const [notes, quizzes] = await Promise.all([
    prisma.studyNote.findMany({
      where: { weekId },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        fileName: true,
        processedStatus: true,
        uploadedAt: true,
      },
    }),
    prisma.quiz.findMany({
      where: { weekId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        score: true,
        createdAt: true,
        noteId: true,
      },
    }),
  ]);

  return NextResponse.json({
    week: {
      id: week.id,
      weekNumber: week.weekNumber,
      title: week.title,
      subject: { id: week.subject.id, name: week.subject.name },
    },
    notes,
    quizzes,
  });
}
