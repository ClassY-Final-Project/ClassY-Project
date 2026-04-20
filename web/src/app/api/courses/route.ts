import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createCourseSchema,
  requireInstructor,
  serializeCourse,
} from "@/app/api/courses/_helpers";

export async function GET(request: Request) {
  try {
    const auth = await requireInstructor(request);
    if (auth.error) return auth.error;

    const courses = await prisma.course.findMany({
      where: { instructorId: auth.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { courses: courses.map(serializeCourse) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Courses GET API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireInstructor(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const validation = createCourseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Doğrulama hatası", details: validation.error.format() },
        { status: 400 },
      );
    }

    const { title, description, price, thumbnailUrl } = validation.data;

    const course = await prisma.course.create({
      data: {
        instructorId: auth.user.id,
        title,
        description: description ?? null,
        price,
        thumbnailUrl: thumbnailUrl ?? null,
      },
    });

    return NextResponse.json(
      {
        message: "Kurs başarıyla oluşturuldu.",
        course: serializeCourse(course),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Courses POST API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}
