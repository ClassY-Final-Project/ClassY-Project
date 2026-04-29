import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      students,
      instructors,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      newUsersThisMonth,
      recentEnrollments,
      recentPublished,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "INSTRUCTOR" } }),
      prisma.course.count(),
      prisma.course.count({ where: { isPublished: true } }),
      prisma.enrollment.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.enrollment.findMany({
        take: 8,
        orderBy: { purchasedAt: "desc" },
        include: {
          student: { select: { fullName: true, email: true } },
          course: { select: { title: true, price: true } },
        },
      }),
      prisma.course.findMany({
        where: { isPublished: true },
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { instructor: { select: { fullName: true, email: true } } },
      }),
    ]);

    // Toplam gelir: kayıt sayısı × kurs fiyatı
    const enrollmentsWithPrice = await prisma.enrollment.findMany({
      include: { course: { select: { price: true } } },
    });
    const totalRevenue = enrollmentsWithPrice.reduce(
      (sum, e) => sum + parseFloat(e.course.price.toString()),
      0
    );

    // Son aktivite akışı
    const activity = [
      ...recentEnrollments.map((e) => ({
        type: "enrollment" as const,
        text: `${e.student.fullName || e.student.email} → "${e.course.title}" kursuna kayıt oldu`,
        price: parseFloat(e.course.price.toString()),
        date: e.purchasedAt.toISOString(),
      })),
      ...recentPublished.map((c) => ({
        type: "published" as const,
        text: `"${c.title}" kursu yayınlandı (${c.instructor.fullName || c.instructor.email})`,
        price: null,
        date: c.updatedAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    return NextResponse.json({
      totalUsers,
      students,
      instructors,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      newUsersThisMonth,
      totalRevenue,
      activity,
    });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
