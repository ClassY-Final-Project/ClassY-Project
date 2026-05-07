import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;

    if (user?.role !== "ADMIN" && user?.role !== "STUDENT") {
      return NextResponse.json({ error: "Yetkisiz erişim. Sadece öğrenciler veya adminler quiz oluşturabilir." }, { status: 403 });
    }

    return NextResponse.json({ message: "Not implemented" });
  } catch (err) {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;

    const url = new URL(request.url);
    const subject = url.searchParams.get("subject");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 20);

    const where: Record<string, unknown> = {
      studentId: user!.userId,
      score: { not: null },
    };
    if (subject) where.subject = subject;

    const quizzes = await prisma.quiz.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        subject: true,
        score: true,
        createdAt: true,
        _count: { select: { questions: true } },
      },
    });

    return NextResponse.json({ quizzes });
  } catch (err) {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
