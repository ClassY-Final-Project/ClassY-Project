import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

type RouteContext = { params: Promise<{ courseId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { user, error } = verifyToken(request);
  if (error) return error;

  const { courseId } = await context.params;

  try {
    const progress = await prisma.lessonProgress.findMany({
      where: { studentId: user!.userId, courseId },
      select: { lessonId: true },
    });
    return NextResponse.json({ completedLessonIds: progress.map((p) => p.lessonId) });
  } catch {
    return NextResponse.json({ completedLessonIds: [] });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { user, error } = verifyToken(request);
  if (error) return error;

  const { courseId } = await context.params;

  try {
    const body = await request.json();
    const { lessonId } = body;

    if (!lessonId) return NextResponse.json({ error: "lessonId gerekli." }, { status: 400 });

    await prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId: user!.userId, lessonId } },
      create: { studentId: user!.userId, lessonId, courseId },
      update: {},
    });

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { lessons: { select: { id: true } } },
    });

    const totalLessons = course?.lessons.length ?? 0;
    const completedCount = await prisma.lessonProgress.count({
      where: { studentId: user!.userId, courseId },
    });

    const allCompleted = totalLessons > 0 && completedCount >= totalLessons;
    return NextResponse.json({ success: true, allCompleted });
  } catch (err) {
    console.error("Progress API hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
