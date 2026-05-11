import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/instructors — Tüm eğitmenleri listele
export async function GET(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  try {
    const instructors = await prisma.user.findMany({
      where: { role: "INSTRUCTOR" },
      select: {
        id: true,
        fullName: true,
        email: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            subscribers: true,
            liveRoomsHosted: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Her eğitmen için mevcut kullanıcının abonelik durumunu ekle
    const instructorsWithSub = await Promise.all(
      instructors.map(async (inst) => {
        const subscription = await (prisma as any).subscription.findUnique({
          where: {
            studentId_instructorId: {
              studentId: user.userId,
              instructorId: inst.id,
            },
          },
        });
        return {
          ...inst,
          isSubscribed: !!subscription,
          subscriptionPaid: subscription?.isPaid ?? false,
        };
      })
    );

    return NextResponse.json({ instructors: instructorsWithSub });
  } catch (err) {
    console.error("Instructors GET hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
