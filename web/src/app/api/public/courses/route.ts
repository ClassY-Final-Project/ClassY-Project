import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializePublicCourseCard } from "@/app/api/public/_helpers";

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      where: { isPublished: true },
      include: {
        instructor: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { courses: courses.map(serializePublicCourseCard) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Public Courses GET API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}
