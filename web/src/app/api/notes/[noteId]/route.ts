import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DİKKAT: params tipi Promise olarak güncellendi
/**
 * @swagger
 * /notes/{noteId}:
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
