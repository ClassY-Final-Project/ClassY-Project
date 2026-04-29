import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;

    const { courseId } = await params;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: "Kurs bulunamadı." }, { status: 404 });
    }

    if (user?.role !== "ADMIN" && (user?.role !== "INSTRUCTOR" || course.instructorId !== user.userId)) {
      return NextResponse.json({ error: "Yetkisiz erişim. Bu kursu silme yetkiniz yok." }, { status: 403 });
    }

    await prisma.course.delete({ where: { id: courseId } });

    return NextResponse.json({ message: "Kurs başarıyla silindi." });
  } catch (err) {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
