import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DİKKAT: params tipi Promise olarak güncellendi
/**
 * @swagger
 * /api/notes/{noteId}:
 *   delete:
 *     summary: Belirli bir notu ve ona bağlı çalışma kartlarını siler
 *     tags: [Notes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *         description: Silinecek notun ID'si
 *     responses:
 *       200:
 *         description: Not başarıyla silindi
 *       401:
 *         description: Yetkisiz erişim
 *       404:
 *         description: Not bulunamadı veya silme yetkisi yok
 *       500:
 *         description: Sunucu tarafında hata
 */
// GET /api/notes/[noteId] — Not detayını getir
export async function GET(
  request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (!user) return NextResponse.json({ error: "Kullanıcı doğrulanamadı." }, { status: 401 });

    const { noteId } = await params;
    const note = await prisma.studyNote.findUnique({
      where: { id: noteId },
      include: { flashcards: true },
    });

    if (!note || note.studentId !== user.userId) {
      return NextResponse.json({ error: "Not bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({ note });
  } catch (err: any) {
    console.error("Not Getirme Hatası:", err);
    return NextResponse.json({ error: "Not getirilemedi." }, { status: 500 });
  }
}

// PATCH /api/notes/[noteId] — Notun konusunu değiştir
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (!user) return NextResponse.json({ error: "Kullanıcı doğrulanamadı." }, { status: 401 });

    const { noteId } = await params;
    const { subject } = await request.json();

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: "Konu adı boş olamaz." }, { status: 400 });
    }

    const note = await prisma.studyNote.findUnique({ where: { id: noteId } });
    if (!note || note.studentId !== user.userId) {
      return NextResponse.json({ error: "Not bulunamadı veya yetkiniz yok." }, { status: 404 });
    }

    const updated = await prisma.studyNote.update({
      where: { id: noteId },
      data: { subject: subject.trim() },
    });

    return NextResponse.json({ message: "Konu güncellendi.", subject: updated.subject });
  } catch (err: any) {
    console.error("Not Güncelleme Hatası:", err);
    return NextResponse.json({ error: "Güncelleme sırasında hata oluştu." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ noteId: string }> },
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

    // NEXT.JS 16 ÇÖZÜMÜ: params'ı await ile çözümlüyoruz
    const resolvedParams = await params;
    const currentNoteId = resolvedParams.noteId;

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
