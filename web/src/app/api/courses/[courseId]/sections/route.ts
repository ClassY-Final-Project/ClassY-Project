import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSectionSchema,
  findOwnedCourse,
  isDuplicateSectionOrderIndexError,
  requireInstructor,
  serializeSection,
} from "@/app/api/courses/_helpers";

type CourseSectionsRouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function GET(request: Request, context: CourseSectionsRouteContext) {
  try {
    const auth = await requireInstructor(request);
    if (auth.error) return auth.error;

    const { courseId } = await context.params;
    const course = await findOwnedCourse(courseId, auth.user.id);

    if (!course) {
      return NextResponse.json(
        { error: "Kurs bulunamadı." },
        { status: 404 },
      );
    }

    const sections = await prisma.courseSection.findMany({
      where: { courseId: course.id },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json(
      { sections: sections.map(serializeSection) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Course Sections GET API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: CourseSectionsRouteContext) {
  try {
    const auth = await requireInstructor(request);
    if (auth.error) return auth.error;

    const { courseId } = await context.params;
    const course = await findOwnedCourse(courseId, auth.user.id);

    if (!course) {
      return NextResponse.json(
        { error: "Kurs bulunamadı." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const validation = createSectionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Doğrulama hatası", details: validation.error.format() },
        { status: 400 },
      );
    }

    const { title, orderIndex } = validation.data;

    try {
      const section = await prisma.courseSection.create({
        data: {
          courseId: course.id,
          title,
          orderIndex,
        },
      });

      return NextResponse.json(
        {
          message: "Bölüm başarıyla oluşturuldu.",
          section: serializeSection(section),
        },
        { status: 201 },
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
    console.error("Course Sections POST API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}
