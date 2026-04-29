import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;

    const { noteId } = await params;

    const note = await prisma.studyNote.findUnique({ where: { id: noteId } });
    if (!note) {
      return NextResponse.json({ error: "Not bulunamadı." }, { status: 404 });
    }

    if (user?.role !== "ADMIN" && (user?.role !== "STUDENT" || note.studentId !== user.userId)) {
      return NextResponse.json({ error: "Yetkisiz erişim. Bu notu silme yetkiniz yok." }, { status: 403 });
    }

    await prisma.studyNote.delete({ where: { id: noteId } });

    return NextResponse.json({ message: "Not başarıyla silindi." });
  } catch (err) {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
