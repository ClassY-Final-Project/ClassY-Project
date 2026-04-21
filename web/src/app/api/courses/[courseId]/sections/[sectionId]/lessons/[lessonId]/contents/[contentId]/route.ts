import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findOwnedCourse,
  findOwnedLesson,
  findOwnedLessonContent,
  findOwnedSection,
  isDuplicateLessonContentOrderIndexError,
  requireInstructor,
  serializeLessonContent,
  updateLessonContentSchema,
  validateUpdatedLessonContentPayload,
} from "@/app/api/courses/_helpers";

type LessonContentRouteContext = {
  params: Promise<{
    courseId: string;
    sectionId: string;
    lessonId: string;
    contentId: string;
  }>;
};

export async function PATCH(request: Request, context: LessonContentRouteContext) {
  try {
    const auth = await requireInstructor(request);
    if (auth.error) return auth.error;

    const { courseId, sectionId, lessonId, contentId } = await context.params;
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

    const lesson = await findOwnedLesson(lessonId, course.id, section.id, auth.user.id);

    if (!lesson) {
      return NextResponse.json(
        { error: "Ders bulunamadı." },
        { status: 404 },
      );
    }

    const existingContent = await findOwnedLessonContent(
      contentId,
      lesson.id,
      course.id,
      section.id,
      auth.user.id,
    );

    if (!existingContent) {
      return NextResponse.json(
        { error: "İçerik bulunamadı." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const validation = updateLessonContentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Doğrulama hatası", details: validation.error.format() },
        { status: 400 },
      );
    }

    const mergedValidation = validateUpdatedLessonContentPayload(
      {
        contentType: existingContent.contentType,
        assetUrl: existingContent.assetUrl,
        textContent: existingContent.textContent,
      },
      validation.data,
    );

    if (!mergedValidation.success) {
      return NextResponse.json(
        { error: "Doğrulama hatası", details: mergedValidation.error.format() },
        { status: 400 },
      );
    }

    const {
      contentType,
      title,
      assetUrl,
      textContent,
      mimeType,
      duration,
      orderIndex,
    } = validation.data;

    try {
      const content = await prisma.lessonContent.update({
        where: { id: existingContent.id },
        data: {
          ...(contentType !== undefined ? { contentType } : {}),
          ...(title !== undefined ? { title: title ?? null } : {}),
          ...(assetUrl !== undefined ? { assetUrl: assetUrl ?? null } : {}),
          ...(textContent !== undefined ? { textContent: textContent ?? null } : {}),
          ...(mimeType !== undefined ? { mimeType: mimeType ?? null } : {}),
          ...(duration !== undefined ? { duration } : {}),
          ...(orderIndex !== undefined ? { orderIndex } : {}),
        },
      });

      return NextResponse.json(
        {
          message: "İçerik başarıyla güncellendi.",
          content: serializeLessonContent(content),
        },
        { status: 200 },
      );
    } catch (error) {
      if (isDuplicateLessonContentOrderIndexError(error)) {
        return NextResponse.json(
          { error: "Bu ders içinde aynı sıra değerine sahip başka bir içerik zaten var." },
          { status: 409 },
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("Lesson Content PATCH API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: LessonContentRouteContext) {
  try {
    const auth = await requireInstructor(request);
    if (auth.error) return auth.error;

    const { courseId, sectionId, lessonId, contentId } = await context.params;
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

    const lesson = await findOwnedLesson(lessonId, course.id, section.id, auth.user.id);

    if (!lesson) {
      return NextResponse.json(
        { error: "Ders bulunamadı." },
        { status: 404 },
      );
    }

    const existingContent = await findOwnedLessonContent(
      contentId,
      lesson.id,
      course.id,
      section.id,
      auth.user.id,
    );

    if (!existingContent) {
      return NextResponse.json(
        { error: "İçerik bulunamadı." },
        { status: 404 },
      );
    }

    await prisma.lessonContent.delete({
      where: { id: existingContent.id },
    });

    return NextResponse.json(
      { message: "İçerik başarıyla silindi." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Lesson Content DELETE API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}
