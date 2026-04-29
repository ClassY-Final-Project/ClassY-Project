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

    const [enrollments, courses, quizzes, studyNotes, flashcards] = await Promise.all([
      prisma.enrollment.findMany({
        include: {
          course: {
            select: {
              id: true,
              title: true,
              price: true,
              instructor: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
        orderBy: { purchasedAt: "asc" },
      }),
      prisma.course.findMany({
        where: { isPublished: true },
        include: {
          instructor: { select: { id: true, fullName: true, email: true } },
          _count: { select: { enrollments: true, reviews: true } },
        },
        orderBy: { enrollments: { _count: "desc" } },
        take: 10,
      }),
      prisma.quiz.count(),
      prisma.studyNote.count(),
      prisma.flashcard.count(),
    ]);

    // Aylık gelir (son 6 ay)
    const now = new Date();
    const months: { label: string; revenue: number; enrollmentCount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthEnrollments = enrollments.filter(
        (e) => new Date(e.purchasedAt) >= start && new Date(e.purchasedAt) <= end
      );
      months.push({
        label: d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" }),
        revenue: monthEnrollments.reduce((sum, e) => sum + parseFloat(e.course.price.toString()), 0),
        enrollmentCount: monthEnrollments.length,
      });
    }

    // Kurs bazlı gelir (top 10)
    const courseRevenue = courses.map((c) => {
      const courseEnrollments = enrollments.filter((e) => e.course.id === c.id);
      const revenue = courseEnrollments.reduce((sum, e) => sum + parseFloat(e.course.price.toString()), 0);
      return {
        id: c.id,
        title: c.title,
        instructor: c.instructor,
        enrollmentCount: c._count.enrollments,
        reviewCount: c._count.reviews,
        revenue,
        price: c.price.toString(),
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // Eğitmen bazlı gelir
    const instructorMap = new Map<string, { id: string; name: string; revenue: number; enrollments: number; courses: number }>();
    enrollments.forEach((e) => {
      const inst = e.course.instructor;
      const key = inst.id;
      if (!instructorMap.has(key)) {
        instructorMap.set(key, { id: inst.id, name: inst.fullName || inst.email, revenue: 0, enrollments: 0, courses: 0 });
      }
      const entry = instructorMap.get(key)!;
      entry.revenue += parseFloat(e.course.price.toString());
      entry.enrollments += 1;
    });
    courses.forEach((c) => {
      const key = c.instructor.id;
      if (instructorMap.has(key)) {
        instructorMap.get(key)!.courses = (instructorMap.get(key)!.courses || 0) + 1;
      }
    });
    const instructorRevenue = Array.from(instructorMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    // AI istatistikleri (bu ay vs toplam)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [quizzesThisMonth, notesThisMonth] = await Promise.all([
      prisma.quiz.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.studyNote.count({ where: { uploadedAt: { gte: startOfMonth } } }),
    ]);

    return NextResponse.json({
      monthlyRevenue: months,
      courseRevenue,
      instructorRevenue,
      aiStats: {
        totalQuizzes: quizzes,
        totalNotes: studyNotes,
        totalFlashcards: flashcards,
        quizzesThisMonth,
        notesThisMonth,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
