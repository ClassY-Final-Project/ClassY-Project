import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/instructors/subscriptions — Benim aboneliklerim
export async function GET(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  try {
    const subscriptions = await (prisma as any).subscription.findMany({
      where: { studentId: user.userId },
      include: {
        instructor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            bio: true,
            avatarUrl: true,
            _count: { select: { liveRoomsHosted: true } },
          },
        },
      },
      orderBy: { subscribedAt: "desc" },
    });

    return NextResponse.json({ subscriptions });
  } catch (err) {
    console.error("Subscriptions GET hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
