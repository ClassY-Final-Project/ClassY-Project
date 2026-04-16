import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/instructor/subscribers — Bu eğitmene abone olan öğrencileri getirir
export async function GET(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Sadece eğitmenler erişebilir." }, { status: 403 });
    }

    const subscriptions = await (prisma as any).subscription.findMany({
      where: { instructorId: user.userId },
      include: {
        student: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { subscribedAt: "desc" },
    });

    const students = subscriptions.map((s: any) => ({
      id: s.student.id,
      fullName: s.student.fullName,
      email: s.student.email,
      subscribedAt: s.subscribedAt,
    }));

    return NextResponse.json({ students });
  } catch (err: any) {
    console.error("Subscriber listesi hatası:", err);
    return NextResponse.json({ error: "Öğrenci listesi alınamadı." }, { status: 500 });
  }
}
