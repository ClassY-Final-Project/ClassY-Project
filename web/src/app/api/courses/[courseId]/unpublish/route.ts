import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findOwnedCourse,
  requireInstructor,
  serializeCourse,
} from "@/app/api/courses/_helpers";

type CourseRouteContext = {
  params: Promise<{ courseId: string }>;
};

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

    const course = await prisma.course.update({
      where: { id: existingCourse.id },
      data: { isPublished: false },
    });

    return NextResponse.json(
      {
        message: "Kurs taslak durumuna alındı.",
        course: serializeCourse(course),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Course Unpublish API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}
