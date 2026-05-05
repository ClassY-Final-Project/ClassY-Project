import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/subjects — Öğrencinin tüm derslerini ve haftalarını getir
export async function GET(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const subjects = await prisma.subject.findMany({
    where: { studentId: user.userId },
    orderBy: { createdAt: "asc" },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          _count: { select: { notes: true, quizzes: true } },
        },
      },
    },
  });

  return NextResponse.json({ subjects });
}

// POST /api/subjects — Yeni ders ekle
export async function POST(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  try {
    const { name, weekCount } = await request.json();
    const trimmed = (name || "").trim();
    const count = Number(weekCount);

    if (!trimmed) {
      return NextResponse.json({ error: "Ders adı gerekli." }, { status: 400 });
    }
    if (!count || count < 1 || count > 52) {
      return NextResponse.json(
        { error: "Hafta sayısı 1 ile 52 arasında olmalıdır." },
        { status: 400 }
      );
    }

    const subject = await prisma.subject.create({
      data: {
        studentId: user.userId,
        name: trimmed,
        weekCount: count,
        weeks: {
          create: Array.from({ length: count }, (_, i) => ({
            weekNumber: i + 1,
          })),
        },
      },
      include: {
        weeks: {
          orderBy: { weekNumber: "asc" },
          include: { _count: { select: { notes: true, quizzes: true } } },
        },
      },
    });

    return NextResponse.json({ subject }, { status: 201 });
  } catch (err: any) {
    console.error("Ders ekleme hatası:", err);
    return NextResponse.json(
      { error: "Ders eklenirken hata oluştu." },
      { status: 500 }
    );
  }
}
