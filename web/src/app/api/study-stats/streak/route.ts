import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export async function GET(req: Request) {
  const { user, error } = verifyToken(req);
  if (error) return error;

  const since = new Date();
  since.setDate(since.getDate() - 89); // son 90 gün

  const [notes, quizzes] = await Promise.all([
    prisma.studyNote.findMany({
      where: { studentId: user!.userId, uploadedAt: { gte: since } },
      select: { uploadedAt: true },
    }),
    prisma.quiz.findMany({
      where: { studentId: user!.userId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  // Pomodoro seansları — Prisma client henüz güncel değilse raw SQL kullan, hata olursa yoksay
  let pomodoroSessions: { completedAt: Date }[] = [];
  try {
    if ((prisma as any).pomodoroSession) {
      pomodoroSessions = await (prisma as any).pomodoroSession.findMany({
        where: { userId: user!.userId, completedAt: { gte: since } },
        select: { completedAt: true },
      });
    } else {
      pomodoroSessions = await prisma.$queryRaw<{ completedAt: Date }[]>`
        SELECT "completedAt" FROM pomodoro_sessions
        WHERE "userId" = ${user!.userId} AND "completedAt" >= ${since}
      `;
    }
  } catch {
    // pomodoro_sessions tablosu henüz migrate edilmemişse sessizce devam et
  }

  // Aktif günler kümesi
  const activeDays = new Set<string>();
  for (const n of notes) activeDays.add(toDateStr(new Date(n.uploadedAt)));
  for (const q of quizzes) activeDays.add(toDateStr(new Date(q.createdAt)));
  for (const p of pomodoroSessions) activeDays.add(toDateStr(new Date(p.completedAt)));

  // Streak hesapla (bugünden geriye)
  const today = toDateStr(new Date());
  let streak = 0;
  const cursor = new Date();
  // Bugün aktifse başla, değilse dünden başla
  if (!activeDays.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (activeDays.has(toDateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // En uzun seriyi hesapla (son 90 gün içinde)
  let longestStreak = 0;
  let currentRun = 0;
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (activeDays.has(toDateStr(d))) {
      currentRun++;
      longestStreak = Math.max(longestStreak, currentRun);
    } else {
      currentRun = 0;
    }
  }

  return NextResponse.json({
    activeDays: Array.from(activeDays),
    streak,
    longestStreak,
    totalActiveDays: activeDays.size,
    today,
  });
}
