import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/subjects/[subjectId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { subjectId } = await params;
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject || subject.studentId !== user.userId) {
    return NextResponse.json({ error: "Ders bulunamadı." }, { status: 404 });
  }

  await prisma.subject.delete({ where: { id: subjectId } });
  return NextResponse.json({ ok: true });
}
