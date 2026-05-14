import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/study-stats — Öğrencinin ders bazlı çalışma istatistikleri
export async function GET(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  try {
    // 1. Çalışma odası oturumları (tamamlanan + devam eden)
    const sessions = await (prisma as any).studyRoomParticipant.findMany({
      where: { userId: user.userId },
      include: { room: { select: { topic: true, name: true } } },
    });

    // Ders → toplam saniye
    const roomTimeBySubject: Record<string, number> = {};
    for (const s of sessions) {
      const subject = s.studying || "Genel Çalışma";
      const start = new Date(s.joinedAt).getTime();
      const end = s.leftAt ? new Date(s.leftAt).getTime() : Date.now();
      const secs = Math.max(0, Math.floor((end - start) / 1000));
      roomTimeBySubject[subject] = (roomTimeBySubject[subject] || 0) + secs;
    }

    // 2. Notlar (ders başına)
    const notes = await (prisma as any).studyNote.findMany({
      where: { studentId: user.userId },
      select: { subject: true, processedStatus: true },
    });
    const notesBySubject: Record<string, number> = {};
    for (const n of notes) {
      const s = n.subject || "Genel";
      notesBySubject[s] = (notesBySubject[s] || 0) + 1;
    }

    // 3. Quizler (ders başına)
    const quizzes = await (prisma as any).quiz.findMany({
      where: { studentId: user.userId, score: { not: null } },
      select: { subject: true, score: true },
    });
    const quizzesBySubject: Record<string, { count: number; totalScore: number }> = {};
    for (const q of quizzes) {
      const s = q.subject || "Genel";
      if (!quizzesBySubject[s]) quizzesBySubject[s] = { count: 0, totalScore: 0 };
      quizzesBySubject[s].count++;
      quizzesBySubject[s].totalScore += q.score || 0;
    }

    // Kullanıcının bizzat eklediği dersleri çek
    const userSubjects = await prisma.subject.findMany({
      where: { studentId: user.userId },
      select: { name: true },
    });
    const userSubjectNames = new Set(userSubjects.map((s) => s.name));

    // Tüm dersleri birleştir
    const allSubjects = new Set([
      ...Object.keys(roomTimeBySubject),
      ...Object.keys(notesBySubject),
      ...Object.keys(quizzesBySubject),
    ]);

    const allStats = Array.from(allSubjects).map((subject) => ({
      subject,
      studySeconds: roomTimeBySubject[subject] || 0,
      noteCount: notesBySubject[subject] || 0,
      quizCount: quizzesBySubject[subject]?.count || 0,
      avgScore: quizzesBySubject[subject]
        ? Math.round(
            quizzesBySubject[subject].totalScore /
              quizzesBySubject[subject].count
          )
        : null,
    }));

    // Toplam çalışma süresi (filtrelemeden önce, tüm aktiviteleri kapsar)
    const totalStudySeconds = allStats.reduce(
      (sum, s) => sum + s.studySeconds,
      0
    );

    // Sadece kullanıcının eklediği dersleri filtrele
    const stats = allStats.filter((s) => userSubjectNames.has(s.subject));

    // Çalışma süresine göre sırala
    stats.sort((a, b) => b.studySeconds - a.studySeconds);

    return NextResponse.json({ stats, totalStudySeconds });
  } catch (err) {
    console.error("Study stats hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
