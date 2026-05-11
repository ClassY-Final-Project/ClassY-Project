import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/instructors/[instructorId]/subscribe — Eğitmene abone ol
export async function POST(request: Request, { params }: { params: Promise<{ instructorId: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { instructorId } = await params;

  if (user.userId === instructorId) {
    return NextResponse.json({ error: "Kendinize abone olamazsınız." }, { status: 400 });
  }

  try {
    const instructor = await prisma.user.findUnique({
      where: { id: instructorId, role: "INSTRUCTOR" },
    });
    if (!instructor) return NextResponse.json({ error: "Eğitmen bulunamadı." }, { status: 404 });

    // Ödeme simülasyonu — gerçek projede burada Stripe vs. olur
    const body = await request.json().catch(() => ({}));
    const { paid } = body; // frontend'den "paid: true" gelirse ödeme tamamlandı kabul et

    const subscription = await (prisma as any).subscription.upsert({
      where: {
        studentId_instructorId: {
          studentId: user.userId,
          instructorId,
        },
      },
      create: {
        studentId: user.userId,
        instructorId,
        isPaid: paid === true,
      },
      update: {
        isPaid: paid === true,
      },
    });

    return NextResponse.json({ subscription, message: "Abonelik başarılı." });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

// DELETE /api/instructors/[instructorId]/subscribe — Aboneliği iptal et
export async function DELETE(request: Request, { params }: { params: Promise<{ instructorId: string }> }) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { instructorId } = await params;

  try {
    await (prisma as any).subscription.deleteMany({
      where: { studentId: user.userId, instructorId },
    });
    return NextResponse.json({ message: "Abonelik iptal edildi." });
  } catch (err) {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
