import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { noteId: string } },
) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı doğrulanamadı." },
        { status: 401 },
      );
    }

    const currentNoteId = params.noteId;

    // Not kontrolü
    const note = await prisma.studyNote.findUnique({
      where: { id: currentNoteId },
    });

    if (!note || note.studentId !== user.userId) {
      return NextResponse.json(
        { error: "Not bulunamadı veya silme yetkiniz yok." },
        { status: 404 },
      );
    }

    // Notu Sil (Cascade sayesinde bağlı 'Flashcard'lar da silinecek)
    await prisma.studyNote.delete({
      where: { id: currentNoteId },
    });

    return NextResponse.json(
      { message: "Not ve çalışma kartları başarıyla silindi." },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Not Silme Hatası:", err);
    return NextResponse.json(
      { error: "Not silinirken bir hata oluştu." },
      { status: 500 },
    );
  }
}
