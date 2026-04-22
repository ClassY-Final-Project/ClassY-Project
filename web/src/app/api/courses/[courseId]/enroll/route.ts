import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

type RouteContext = { params: Promise<{ courseId: string }> };

// GET — öğrencinin bu kursa kayıtlı olup olmadığını kontrol et
export async function GET(request: Request, context: RouteContext) {
  const { user, error } = verifyToken(request);
  if (error) return error;

  const { courseId } = await context.params;

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: user!.userId, courseId } },
  });

  return NextResponse.json({ enrolled: !!enrollment });
}

// POST — kursa kayıt ol
export async function POST(request: Request, context: RouteContext) {
  const { user, error } = verifyToken(request);
  if (error) return error;

  const { courseId } = await context.params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, isPublished: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Kurs bulunamadı." }, { status: 404 });
  }

  const existing = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: user!.userId, courseId } },
  });

  if (existing) {
    return NextResponse.json({ enrolled: true, message: "Zaten kayıtlısınız." });
  }

  const [, student] = await Promise.all([
    prisma.enrollment.create({ data: { studentId: user!.userId, courseId } }),
    prisma.user.findUnique({ where: { id: user!.userId }, select: { fullName: true, email: true } }),
  ]);

  // Eğitmene bildirim gönder
  await prisma.notification.create({
    data: {
      userId: course.instructorId,
      type: "NEW_ENROLLMENT",
      message: `${student?.fullName || student?.email || "Bir öğrenci"} "${course.title}" kursuna kaydoldu.`,
    },
  }).catch(() => {});

  return NextResponse.json({ enrolled: true, message: "Kursa başarıyla kaydoldunuz." });
}
