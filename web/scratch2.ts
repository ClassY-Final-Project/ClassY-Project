import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'dhs@gmail.com' } });
  if (!user) return console.log("User not found");
  console.log("User ID:", user.id);

  const karne = await prisma.subject.findMany({
    where: { studentId: user.id },
  });
  console.log("Subjects for this user:", karne.map(s => s.name));

  const allSubjects = await prisma.subject.findMany();
  console.log("All subjects in DB:", allSubjects.map(s => ({ name: s.name, studentId: s.studentId })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
