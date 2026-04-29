import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

type Ctx = { params: Promise<{ courseId: string }> };

// PATCH /api/admin/courses/[courseId] — yayına al / yayından kaldır
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const { courseId } = await params;
    const { isPublished } = await request.json();

    const course = await prisma.course.update({
      where: { id: courseId },
      data: { isPublished },
      select: { id: true, title: true, isPublished: true },
    });

    return NextResponse.json({ course });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
