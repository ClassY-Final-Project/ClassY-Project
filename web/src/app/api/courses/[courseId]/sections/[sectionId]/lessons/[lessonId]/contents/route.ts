import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createLessonContentSchema,
  findOwnedCourse,
  findOwnedLesson,
  findOwnedSection,
  isDuplicateLessonContentOrderIndexError,
  requireInstructor,
  serializeLessonContent,
} from "@/app/api/courses/_helpers";

type LessonContentsRouteContext = {
  params: Promise<{ courseId: string; sectionId: string; lessonId: string }>;
};

export async function GET(request: Request, context: LessonContentsRouteContext) {
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

    const lesson = await findOwnedLesson(lessonId, course.id, section.id, auth.user.id);

    if (!lesson) {
      return NextResponse.json(
        { error: "Ders bulunamadı." },
        { status: 404 },
      );
    }

    const contents = await prisma.lessonContent.findMany({
      where: { lessonId: lesson.id },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json(
      { contents: contents.map(serializeLessonContent) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Lesson Contents GET API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: LessonContentsRouteContext) {
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

    const lesson = await findOwnedLesson(lessonId, course.id, section.id, auth.user.id);

    if (!lesson) {
      return NextResponse.json(
        { error: "Ders bulunamadı." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const validation = createLessonContentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Doğrulama hatası", details: validation.error.format() },
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
      const content = await prisma.lessonContent.create({
        data: {
          lessonId: lesson.id,
          contentType,
          title: title ?? null,
          assetUrl: assetUrl ?? null,
          textContent: textContent ?? null,
          mimeType: mimeType ?? null,
          duration: duration ?? null,
          orderIndex,
        },
      });

      return NextResponse.json(
        {
          message: "İçerik başarıyla oluşturuldu.",
          content: serializeLessonContent(content),
        },
        { status: 201 },
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
    console.error("Lesson Contents POST API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}
