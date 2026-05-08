import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/my-courses — Öğrencinin kayıtlı (satın aldığı) kursları
export async function GET(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: user.userId },
    orderBy: { purchasedAt: "desc" },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          instructor: { select: { id: true, fullName: true, email: true } },
          lessons: { select: { id: true } },
        },
      },
    },
  });

  const courseIds = enrollments.map((e) => e.courseId);
  const progressRecords = await prisma.lessonProgress.findMany({
    where: { studentId: user.userId, courseId: { in: courseIds } },
    select: { courseId: true, lessonId: true },
  });

  const progressByCourse: Record<string, number> = {};
  for (const p of progressRecords) {
    progressByCourse[p.courseId] = (progressByCourse[p.courseId] ?? 0) + 1;
  }

  const courses = enrollments.map((e) => {
    const totalLessons = e.course.lessons.length;
    const completedLessons = progressByCourse[e.courseId] ?? 0;
    return {
      enrollmentId: e.id,
      purchasedAt: e.purchasedAt,
      id: e.course.id,
      title: e.course.title,
      description: e.course.description,
      thumbnailUrl: e.course.thumbnailUrl,
      instructor: e.course.instructor,
      totalLessons,
      completedLessons,
      progressPct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    };
  });

  return NextResponse.json({ courses });
}
