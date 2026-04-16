import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/instructor/quiz/sent-count — Eğitmenin atadığı toplam quiz sayısı
export async function GET(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

    const count = await prisma.quiz.count({
      where: { assignedByInstructorId: user.userId },
    });

    return NextResponse.json({ count });
  } catch (err: any) {
    console.error("Quiz Sayısı Hatası:", err);
    return NextResponse.json({ error: "Sayı alınamadı." }, { status: 500 });
  }
}
