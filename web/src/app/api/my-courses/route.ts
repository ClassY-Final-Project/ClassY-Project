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
        },
      },
    },
  });

  const courses = enrollments.map((e) => ({
    enrollmentId: e.id,
    purchasedAt: e.purchasedAt,
    ...e.course,
  }));

  return NextResponse.json({ courses });
}
