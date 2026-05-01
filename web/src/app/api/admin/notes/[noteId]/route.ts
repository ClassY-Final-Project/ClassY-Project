import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

type Ctx = { params: Promise<{ noteId: string }> };

// DELETE /api/admin/notes/[noteId] — Ders notunu sil
export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const { noteId } = await params;

    const existing = await prisma.studyNote.findUnique({ where: { id: noteId } });
    if (!existing) {
      return NextResponse.json({ error: "Not bulunamadı." }, { status: 404 });
    }

    await prisma.studyNote.delete({ where: { id: noteId } });
    return NextResponse.json({ message: "Ders notu silindi." });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
