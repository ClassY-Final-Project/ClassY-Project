import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/karne — Öğrencinin karne verilerini tek seferde getirir
export async function GET(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  try {
    // 1. Dersler — haftalarla birlikte (PDF doluluk oranı için)
    const subjects = await prisma.subject.findMany({
      where: { studentId: user.userId },
      orderBy: { createdAt: "asc" },
      include: {
        weeks: {
          orderBy: { weekNumber: "asc" },
          include: {
            _count: { select: { notes: true } },
          },
        },
      },
    });

    const subjectStats = subjects.map((s) => {
      const totalWeeks = s.weeks.length;
      const weeksWithPdf = s.weeks.filter((w) => w._count.notes > 0).length;
      const totalPdfs = s.weeks.reduce((sum, w) => sum + w._count.notes, 0);
      const pct = totalWeeks > 0 ? Math.round((weeksWithPdf / totalWeeks) * 100) : 0;
      return {
        id: s.id,
        name: s.name,
        totalWeeks,
        weeksWithPdf,
        totalPdfs,
        pct,
      };
    });

    // 2. Kurslar — ilerleme bilgisiyle
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: user.userId },
      orderBy: { purchasedAt: "desc" },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            instructor: { select: { fullName: true, email: true } },
            lessons: { select: { id: true } },
          },
        },
      },
    });

    const courseStats = await Promise.all(
      enrollments.map(async (e) => {
        const totalLessons = e.course.lessons.length;
        const completedCount = await prisma.lessonProgress.count({
          where: { studentId: user.userId, courseId: e.course.id },
        });
        const allCompleted = totalLessons > 0 && completedCount >= totalLessons;
        const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
        return {
          courseId: e.course.id,
          title: e.course.title,
          thumbnailUrl: e.course.thumbnailUrl,
          instructor: e.course.instructor,
          totalLessons,
          completedLessons: completedCount,
          allCompleted,
          pct,
        };
      })
    );

    // 3. Quizler — hem kendi oluşturduğu hem eğitmenin atadığı
    const quizzes = await prisma.quiz.findMany({
      where: { studentId: user.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        subject: true,
        score: true,
        createdAt: true,
        assignedByInstructorId: true,
        assignedByInstructor: { select: { fullName: true, email: true } },
      },
    });

    const quizStats = quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      subject: q.subject,
      score: q.score,
      createdAt: q.createdAt,
      isAssigned: !!q.assignedByInstructorId,
      instructor: q.assignedByInstructor ?? null,
    }));

    // 4. Canlı Dersler — katılım geçmişi
    const participations = await (prisma as any).roomParticipant.findMany({
      where: { userId: user.userId },
      orderBy: { joinedAt: "desc" },
      include: {
        room: {
          include: {
            instructor: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });

    const liveRooms = participations.map((p: any) => ({
      id: p.room.id,
      name: p.room.name,
      status: p.room.status,
      startedAt: p.room.startedAt,
      endedAt: p.room.endedAt,
      joinedAt: p.joinedAt,
      instructor: p.room.instructor,
    }));

    return NextResponse.json({ subjectStats, courseStats, quizStats, liveRooms });
  } catch (err) {
    console.error("Karne API hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
