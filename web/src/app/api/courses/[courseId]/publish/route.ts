import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireInstructor,
  serializeCourse,
  validateCoursePublishReadiness,
} from "@/app/api/courses/_helpers";

type CourseRouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function PATCH(request: Request, context: CourseRouteContext) {
  try {
    const auth = await requireInstructor(request);
    if (auth.error) return auth.error;

    const { courseId } = await context.params;
    const readiness = await validateCoursePublishReadiness(courseId, auth.user.id);

    if (!readiness.course) {
      return NextResponse.json(
        { error: "Kurs bulunamadı." },
        { status: 404 },
      );
    }

    if (!readiness.success) {
      return NextResponse.json(
        {
          error: "Kurs yayınlanmaya hazır değil.",
          issues: readiness.issues,
        },
        { status: 400 },
      );
    }

    const course = await prisma.course.update({
      where: { id: readiness.course.id },
      data: { isPublished: true },
    });

    return NextResponse.json(
      {
        message: "Kurs yayına alındı.",
        course: serializeCourse(course),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Course Publish API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}
