import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { enrollments: { some: {} } }
  });
  if (users.length === 0) {
    console.log("No users with enrollments found.");
    return;
  }
  const user = users[0];
  console.log("Found user:", user.email);

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: user.id },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          lessons: { select: { id: true } },
        },
      },
    },
  });

  for (const e of enrollments) {
    const totalLessons = e.course.lessons.length;
    const completedCount = await prisma.lessonProgress.count({
      where: { studentId: user.id, courseId: e.course.id },
    });
    console.log(`Course: ${e.course.title}`);
    console.log(`Total Lessons: ${totalLessons}`);
    console.log(`Completed Count: ${completedCount}`);
    
    // Also let's see how many progress records WITHOUT courseId filter just in case
    const lessonIds = e.course.lessons.map(l => l.id);
    const completedCountByLessonIds = await prisma.lessonProgress.count({
      where: { studentId: user.id, lessonId: { in: lessonIds } },
    });
    console.log(`Completed Count (by lessonId): ${completedCountByLessonIds}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
