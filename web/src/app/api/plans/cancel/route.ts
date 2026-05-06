import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/plans/cancel — Cancel active plan (reset to FREE)
export async function POST(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  try {
    await prisma.user.update({
      where: { id: user.userId },
      data: {
        plan: "FREE",
        planExpiresAt: null,
      },
    });

    return NextResponse.json({ message: "Plan iptal edildi." });
  } catch (err) {
    console.error("Plan cancel error:", err);
    return NextResponse.json({ error: "Plan iptal edilemedi." }, { status: 500 });
  }
}
