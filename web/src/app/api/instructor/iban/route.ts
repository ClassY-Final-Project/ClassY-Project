import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function PATCH(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;

  const body = await request.json();
  const iban: string = (body.iban || "").trim();

  await prisma.user.update({
    where: { id: user!.userId },
    data: { iban: iban || null },
  });

  return NextResponse.json({ success: true });
}
