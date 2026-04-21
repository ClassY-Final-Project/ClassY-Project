import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findOwnedCourse,
  requireInstructor,
  serializeCourse,
  updateCourseSchema,
} from "@/app/api/courses/_helpers";

type CourseRouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function GET(request: Request, context: CourseRouteContext) {
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

    return NextResponse.json(
      { course: serializeCourse(course) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Course Detail GET API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: CourseRouteContext) {
  try {
    const auth = await requireInstructor(request);
    if (auth.error) return auth.error;

    const { courseId } = await context.params;
    const existingCourse = await findOwnedCourse(courseId, auth.user.id);

    if (!existingCourse) {
      return NextResponse.json(
        { error: "Kurs bulunamadı." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const validation = updateCourseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Doğrulama hatası", details: validation.error.format() },
        { status: 400 },
      );
    }

    const { title, description, price, thumbnailUrl } = validation.data;

    const course = await prisma.course.update({
      where: { id: existingCourse.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description: description ?? null } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(thumbnailUrl !== undefined ? { thumbnailUrl: thumbnailUrl ?? null } : {}),
      },
    });

    return NextResponse.json(
      {
        message: "Kurs başarıyla güncellendi.",
        course: serializeCourse(course),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Course PATCH API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: CourseRouteContext) {
  try {
    const auth = await requireInstructor(request);
    if (auth.error) return auth.error;

    const { courseId } = await context.params;
    const existingCourse = await findOwnedCourse(courseId, auth.user.id);

    if (!existingCourse) {
      return NextResponse.json(
        { error: "Kurs bulunamadı." },
        { status: 404 },
      );
    }

    await prisma.course.delete({
      where: { id: existingCourse.id },
    });

    return NextResponse.json(
      { message: "Kurs başarıyla silindi." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Course DELETE API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}
