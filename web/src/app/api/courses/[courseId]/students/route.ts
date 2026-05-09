import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/courses/[courseId]/students — Eğitmen için kurs öğrenci ilerlemesi
export async function GET(req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { user, error } = verifyToken(req);
  if (error) return error;
  if (user!.role === "STUDENT") return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const { courseId } = await params;

  // Kurs eğitmene ait mi kontrol et
  const course = await prisma.course.findFirst({
    where: { id: courseId, instructorId: user!.userId },
    select: { id: true, title: true, lessons: { select: { id: true } } },
  });
  if (!course) return NextResponse.json({ error: "Kurs bulunamadı." }, { status: 404 });

  const totalLessons = course.lessons.length;

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    include: { student: { select: { id: true, fullName: true, email: true, createdAt: true } } },
  });

  const studentIds = enrollments.map((e) => e.studentId);

  const progressRecords = await prisma.lessonProgress.findMany({
    where: { courseId, studentId: { in: studentIds } },
    select: { studentId: true, lessonId: true, completedAt: true },
  });

  const progressByStudent: Record<string, { count: number; lastActivity: Date | null }> = {};
  for (const p of progressRecords) {
    if (!progressByStudent[p.studentId]) progressByStudent[p.studentId] = { count: 0, lastActivity: null };
    progressByStudent[p.studentId].count++;
    if (!progressByStudent[p.studentId].lastActivity || p.completedAt > progressByStudent[p.studentId].lastActivity!) {
      progressByStudent[p.studentId].lastActivity = p.completedAt;
    }
  }

  const students = enrollments.map((e) => {
    const prog = progressByStudent[e.studentId] ?? { count: 0, lastActivity: null };
    const completedLessons = prog.count;
    return {
      id: e.student.id,
      fullName: e.student.fullName,
      email: e.student.email,
      enrolledAt: e.purchasedAt,
      completedLessons,
      totalLessons,
      progressPct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      lastActivity: prog.lastActivity,
    };
  });

  students.sort((a, b) => b.progressPct - a.progressPct);

  return NextResponse.json({
    courseTitle: course.title,
    totalLessons,
    students,
    avgProgress: students.length > 0
      ? Math.round(students.reduce((s, x) => s + x.progressPct, 0) / students.length)
      : 0,
  });
}
