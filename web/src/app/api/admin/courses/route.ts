import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        instructor: { select: { id: true, fullName: true, email: true } },
        _count: { select: { enrollments: true } },
      },
    });

    return NextResponse.json({
      courses: courses.map((c) => ({
        id: c.id,
        title: c.title,
        isPublished: c.isPublished,
        price: c.price.toString(),
        createdAt: c.createdAt,
        instructor: c.instructor,
        enrollmentCount: c._count.enrollments,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
