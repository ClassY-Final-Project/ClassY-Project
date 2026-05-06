import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PLAN_PRICES: Record<string, number> = {
  GOLD: 75,
  PLATINUM: 200,
};

// POST /api/plans/subscribe — Sahte ödeme ile plan satın al
export async function POST(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const { plan } = body;

    if (!plan || !["GOLD", "PLATINUM"].includes(plan)) {
      return NextResponse.json({ error: "Geçersiz plan." }, { status: 400 });
    }

    const amount = PLAN_PRICES[plan];
    const startsAt = new Date();
    const expiresAt = new Date(startsAt);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // PlanSubscription kaydı oluştur
    await (prisma as any).planSubscription.create({
      data: {
        userId: user.userId,
        plan,
        amount,
        startsAt,
        expiresAt,
      },
    });

    // Kullanıcının planını ve son kullanma tarihini güncelle
    await prisma.user.update({
      where: { id: user.userId },
      data: { plan: plan as any, planExpiresAt: expiresAt },
    });

    return NextResponse.json({
      message: `${plan} planına başarıyla abone oldunuz!`,
      plan,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err: any) {
    console.error("Plan subscribe hatası:", err);
    return NextResponse.json({ error: "Ödeme işlemi başarısız.", detail: err?.message }, { status: 500 });
  }
}
