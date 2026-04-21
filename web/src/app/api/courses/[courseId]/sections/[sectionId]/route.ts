import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findOwnedCourse,
  findOwnedSection,
  isDuplicateSectionOrderIndexError,
  requireInstructor,
  serializeSection,
  updateSectionSchema,
} from "@/app/api/courses/_helpers";

type CourseSectionRouteContext = {
  params: Promise<{ courseId: string; sectionId: string }>;
};

export async function PATCH(request: Request, context: CourseSectionRouteContext) {
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

    const existingSection = await findOwnedSection(sectionId, course.id, auth.user.id);

    if (!existingSection) {
      return NextResponse.json(
        { error: "Bölüm bulunamadı." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const validation = updateSectionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Doğrulama hatası", details: validation.error.format() },
        { status: 400 },
      );
    }

    const { title, orderIndex } = validation.data;

    try {
      const section = await prisma.courseSection.update({
        where: { id: existingSection.id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(orderIndex !== undefined ? { orderIndex } : {}),
        },
      });

      return NextResponse.json(
        {
          message: "Bölüm başarıyla güncellendi.",
          section: serializeSection(section),
        },
        { status: 200 },
      );
    } catch (error) {
      if (isDuplicateSectionOrderIndexError(error)) {
        return NextResponse.json(
          { error: "Bu kurs içinde aynı sıra değerine sahip başka bir bölüm zaten var." },
          { status: 409 },
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("Course Section PATCH API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: CourseSectionRouteContext) {
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

    const existingSection = await findOwnedSection(sectionId, course.id, auth.user.id);

    if (!existingSection) {
      return NextResponse.json(
        { error: "Bölüm bulunamadı." },
        { status: 404 },
      );
    }

    await prisma.courseSection.delete({
      where: { id: existingSection.id },
    });

    return NextResponse.json(
      { message: "Bölüm başarıyla silindi." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Course Section DELETE API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}
