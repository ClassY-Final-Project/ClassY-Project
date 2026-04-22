import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;

  const instructor = await prisma.user.findUnique({
    where: { id: user!.userId },
    select: { role: true, iban: true },
  });

  if (!instructor || (instructor.role !== "INSTRUCTOR" && instructor.role !== "ADMIN")) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
  }

  const courses = await prisma.course.findMany({
    where: { instructorId: user!.userId },
    include: {
      enrollments: {
        include: { student: { select: { fullName: true, email: true } } },
        orderBy: { purchasedAt: "desc" },
      },
    },
  });

  const courseEarnings = courses.map((c) => {
    const price = parseFloat(c.price.toString());
    return {
      id: c.id,
      title: c.title,
      price,
      enrollmentCount: c.enrollments.length,
      earnings: price * c.enrollments.length,
      recentEnrollments: c.enrollments.slice(0, 5).map((e) => ({
        studentName: e.student.fullName || e.student.email,
        purchasedAt: e.purchasedAt.toISOString(),
      })),
    };
  });

  const totalEarnings = courseEarnings.reduce((sum, c) => sum + c.earnings, 0);
  const totalStudents = courseEarnings.reduce((sum, c) => sum + c.enrollmentCount, 0);

  return NextResponse.json({
    totalEarnings,
    totalStudents,
    courses: courseEarnings,
    iban: instructor.iban,
  });
}
