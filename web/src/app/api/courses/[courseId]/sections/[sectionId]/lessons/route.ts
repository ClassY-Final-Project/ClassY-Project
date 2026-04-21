import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createLessonSchema,
  findOwnedCourse,
  findOwnedSection,
  isDuplicateLessonOrderIndexError,
  requireInstructor,
  serializeLesson,
} from "@/app/api/courses/_helpers";

type SectionLessonsRouteContext = {
  params: Promise<{ courseId: string; sectionId: string }>;
};

export async function GET(request: Request, context: SectionLessonsRouteContext) {
  try {
    const auth = await requireInstructor(request);
    if (auth.error) return auth.error;

    const { courseId, sectionId } = await context.params;
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

    const lessons = await prisma.lesson.findMany({
      where: {
        courseId: course.id,
        sectionId: section.id,
      },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json(
      { lessons: lessons.map(serializeLesson) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Section Lessons GET API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: SectionLessonsRouteContext) {
  try {
    const auth = await requireInstructor(request);
    if (auth.error) return auth.error;

    const { courseId, sectionId } = await context.params;
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

    const body = await request.json();
    const validation = createLessonSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Doğrulama hatası", details: validation.error.format() },
        { status: 400 },
      );
    }

    const { title, duration, orderIndex } = validation.data;

    try {
      const lesson = await prisma.lesson.create({
        data: {
          courseId: course.id,
          sectionId: section.id,
          title,
          duration: duration ?? null,
          orderIndex,
        },
      });

      return NextResponse.json(
        {
          message: "Ders başarıyla oluşturuldu.",
          lesson: serializeLesson(lesson),
        },
        { status: 201 },
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
    console.error("Section Lessons POST API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}
