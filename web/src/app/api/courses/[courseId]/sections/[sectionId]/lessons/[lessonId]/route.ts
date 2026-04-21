import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findOwnedCourse,
  findOwnedLesson,
  findOwnedSection,
  isDuplicateLessonOrderIndexError,
  requireInstructor,
  serializeLesson,
  updateLessonSchema,
} from "@/app/api/courses/_helpers";

type LessonRouteContext = {
  params: Promise<{ courseId: string; sectionId: string; lessonId: string }>;
};

export async function PATCH(request: Request, context: LessonRouteContext) {
  try {
    const auth = await requireInstructor(request);
    if (auth.error) return auth.error;

    const { courseId, sectionId, lessonId } = await context.params;
    const course = await findOwnedCourse(courseId, auth.user.id);

    if (!course) {
      return NextResponse.json(
        { error: "Kurs bulunamadı." },
        { status: 404 },
      );
    }

    const section = await findOwnedSection(sectionId, course.id, auth.user.id);

    if (!section) {
      return NextResponse.json(
        { error: "Bölüm bulunamadı." },
        { status: 404 },
      );
    }

    const existingLesson = await findOwnedLesson(
      lessonId,
      course.id,
      section.id,
      auth.user.id,
    );

    if (!existingLesson) {
      return NextResponse.json(
        { error: "Ders bulunamadı." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const validation = updateLessonSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Doğrulama hatası", details: validation.error.format() },
        { status: 400 },
      );
    }

    const { title, duration, orderIndex } = validation.data;

    try {
      const lesson = await prisma.lesson.update({
        where: { id: existingLesson.id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(duration !== undefined ? { duration } : {}),
          ...(orderIndex !== undefined ? { orderIndex } : {}),
        },
      });

      return NextResponse.json(
        {
          message: "Ders başarıyla güncellendi.",
          lesson: serializeLesson(lesson),
        },
        { status: 200 },
      );
    } catch (error) {
      if (isDuplicateLessonOrderIndexError(error)) {
        return NextResponse.json(
          { error: "Bu bölüm içinde aynı sıra değerine sahip başka bir ders zaten var." },
          { status: 409 },
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("Lesson PATCH API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: LessonRouteContext) {
  try {
    const auth = await requireInstructor(request);
    if (auth.error) return auth.error;

    const { courseId, sectionId, lessonId } = await context.params;
    const course = await findOwnedCourse(courseId, auth.user.id);

    if (!course) {
      return NextResponse.json(
        { error: "Kurs bulunamadı." },
        { status: 404 },
      );
    }

    const section = await findOwnedSection(sectionId, course.id, auth.user.id);

    if (!section) {
      return NextResponse.json(
        { error: "Bölüm bulunamadı." },
        { status: 404 },
      );
    }

    const existingLesson = await findOwnedLesson(
      lessonId,
      course.id,
      section.id,
      auth.user.id,
    );

    if (!existingLesson) {
      return NextResponse.json(
        { error: "Ders bulunamadı." },
        { status: 404 },
      );
    }

    await prisma.lesson.delete({
      where: { id: existingLesson.id },
    });

    return NextResponse.json(
      { message: "Ders başarıyla silindi." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Lesson DELETE API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}
