import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findPublishedCourse,
  serializePublicCourseCard,
} from "@/app/api/public/_helpers";

type PublicCourseRouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function GET(_request: Request, context: PublicCourseRouteContext) {
  try {
    const { courseId } = await context.params;
    const existingCourse = await findPublishedCourse(courseId);

    if (!existingCourse) {
      return NextResponse.json(
        { error: "Kurs bulunamadı." },
        { status: 404 },
      );
    }

    const course = await prisma.course.findFirst({
      where: {
        id: existingCourse.id,
        isPublished: true,
      },
      include: {
        instructor: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Kurs bulunamadı." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { course: serializePublicCourseCard(course) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Public Course Detail GET API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}
