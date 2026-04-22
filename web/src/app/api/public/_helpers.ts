import { prisma } from "@/lib/prisma";

export function serializePublicCourseCard(course: {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  price: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
  instructor?: {
    id: string;
    fullName: string | null;
    iban?: string | null;
  } | null;
}) {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    thumbnailUrl: course.thumbnailUrl,
    price: course.price.toString(),
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    ...(course.instructor
      ? {
          instructor: {
            id: course.instructor.id,
            fullName: course.instructor.fullName,
            iban: course.instructor.iban ?? null,
          },
        }
      : {}),
  };
}

export function serializePublicLessonContent(content: {
  id: string;
  lessonId: string;
  contentType: string;
  title: string | null;
  assetUrl: string | null;
  textContent: string | null;
  mimeType: string | null;
  duration: number | null;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: content.id,
    lessonId: content.lessonId,
    contentType: content.contentType,
    title: content.title,
    assetUrl: content.assetUrl,
    textContent: content.textContent,
    mimeType: content.mimeType,
    duration: content.duration,
    orderIndex: content.orderIndex,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
  };
}

export function serializePublicLesson(lesson: {
  id: string;
  courseId: string;
  sectionId: string;
  title: string;
  duration: number | null;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
  contents?: Array<{
    id: string;
    lessonId: string;
    contentType: string;
    title: string | null;
    assetUrl: string | null;
    textContent: string | null;
    mimeType: string | null;
    duration: number | null;
    orderIndex: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
}) {
  return {
    id: lesson.id,
    courseId: lesson.courseId,
    sectionId: lesson.sectionId,
    title: lesson.title,
    duration: lesson.duration,
    orderIndex: lesson.orderIndex,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
    ...(lesson.contents
      ? {
          contents: lesson.contents.map(serializePublicLessonContent),
        }
      : {}),
  };
}

export function serializePublicSection(section: {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
  lessons?: Array<{
    id: string;
    courseId: string;
    sectionId: string;
    title: string;
    duration: number | null;
    orderIndex: number;
    createdAt: Date;
    updatedAt: Date;
    contents?: Array<{
      id: string;
      lessonId: string;
      contentType: string;
      title: string | null;
      assetUrl: string | null;
      textContent: string | null;
      mimeType: string | null;
      duration: number | null;
      orderIndex: number;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }>;
}) {
  return {
    id: section.id,
    courseId: section.courseId,
    title: section.title,
    orderIndex: section.orderIndex,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
    ...(section.lessons
      ? {
          lessons: section.lessons.map(serializePublicLesson),
        }
      : {}),
  };
}

export async function findPublishedCourse(courseId: string) {
  return prisma.course.findFirst({
    where: {
      id: courseId,
      isPublished: true,
    },
  });
}
