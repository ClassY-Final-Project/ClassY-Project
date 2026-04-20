import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  serializePublicLesson,
} from "@/app/api/public/_helpers";

type PublicLessonRouteContext = {
  params: Promise<{ courseId: string; sectionId: string; lessonId: string }>;
};

export async function GET(_request: Request, context: PublicLessonRouteContext) {
  try {
    const { courseId, sectionId, lessonId } = await context.params;

    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        courseId,
        sectionId,
        course: {
          isPublished: true,
        },
        section: {
          id: sectionId,
          courseId,
        },
      },
      include: {
        contents: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: "Ders bulunamadı." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { lesson: serializePublicLesson(lesson) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Public Lesson Detail GET API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}
