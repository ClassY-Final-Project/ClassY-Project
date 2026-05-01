import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/admin/notes — Tüm ders notlarını listele
export async function GET(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const notes = await prisma.studyNote.findMany({
      orderBy: { uploadedAt: "desc" },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        _count: { select: { quizzes: true, flashcards: true } },
      },
    });

    return NextResponse.json({
      notes: notes.map((n) => ({
        id: n.id,
        fileName: n.fileName,
        subject: n.subject,
        processedStatus: n.processedStatus,
        uploadedAt: n.uploadedAt,
        summary: n.summary ? n.summary.substring(0, 120) + "..." : null,
        student: n.student,
        quizCount: n._count.quizzes,
        flashcardCount: n._count.flashcards,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
