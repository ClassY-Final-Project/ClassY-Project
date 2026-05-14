import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'dhs@gmail.com' } });
  if (!user) return;
  const sessions = await prisma.studyRoomParticipant.findMany({
      where: { userId: user.id },
      include: { room: { select: { topic: true, name: true } } },
  });
  console.log("Sessions:", sessions);

  const notes = await prisma.studyNote.findMany({
      where: { studentId: user.id },
      select: { subject: true, processedStatus: true },
  });
  console.log("Notes:", notes);

  const quizzes = await prisma.quiz.findMany({
      where: { studentId: user.id, score: { not: null } },
      select: { subject: true, score: true },
  });
  console.log("Quizzes:", quizzes);
}
main().catch(console.error).finally(() => prisma.$disconnect());
