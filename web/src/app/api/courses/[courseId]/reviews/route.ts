import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

type RouteContext = { params: Promise<{ courseId: string }> };

// GET — kurs yorumları (herkese açık)
export async function GET(_request: Request, context: RouteContext) {
  const { courseId } = await context.params;

  const reviews = await prisma.courseReview.findMany({
    where: { courseId },
    include: { student: { select: { fullName: true, email: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      studentName: r.student.fullName || r.student.email.split("@")[0],
      studentAvatarUrl: r.student.avatarUrl ?? null,
    })),
    averageRating: Math.round(avg * 10) / 10,
    totalReviews: reviews.length,
  });
}

// POST — yorum yaz
export async function POST(request: Request, context: RouteContext) {
  const { user, error } = verifyToken(request);
  if (error) return error;

  const { courseId } = await context.params;
  const { rating, comment } = await request.json();

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Puan 1-5 arasında olmalıdır." }, { status: 400 });
  }

  // Kayıtlı öğrenci mi?
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: user!.userId, courseId } },
  });
  if (!enrollment) {
    return NextResponse.json({ error: "Bu kursa kayıtlı değilsiniz." }, { status: 403 });
  }

  const review = await prisma.courseReview.upsert({
    where: { studentId_courseId: { studentId: user!.userId, courseId } },
    create: { studentId: user!.userId, courseId, rating, comment: comment || null },
    update: { rating, comment: comment || null },
  });

  return NextResponse.json({ review });
}
