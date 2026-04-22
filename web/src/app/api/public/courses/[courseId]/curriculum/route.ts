import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  serializePublicCourseCard,
  serializePublicSection,
} from "@/app/api/public/_helpers";

type PublicCourseRouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function GET(_request: Request, context: PublicCourseRouteContext) {
  try {
    const { courseId } = await context.params;

    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        isPublished: true,
      },
      include: {
        instructor: {
          select: {
            id: true,
            fullName: true,
            iban: true,
          },
        },
        sections: {
          orderBy: { orderIndex: "asc" },
          include: {
            lessons: {
              orderBy: { orderIndex: "asc" },
              include: {
                contents: {
                  orderBy: { orderIndex: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Kurs bulunamadı." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        course: serializePublicCourseCard(course),
        sections: course.sections.map(serializePublicSection),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Public Course Curriculum GET API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}
