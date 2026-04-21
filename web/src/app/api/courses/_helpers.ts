import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import {
  collectCoursePublishIssues,
  collectLessonContentTypeIssues,
} from "@/app/api/courses/_domain";

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value));

const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z.string().url("Geçerli bir URL giriniz.").nullable(),
);

const priceSchema = z.preprocess((value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return value;
    return Number(trimmed);
  }
  return value;
}, z.number().finite().min(0, "Fiyat 0 veya daha büyük olmalıdır."));

export const createCourseSchema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter olmalıdır.").max(200, "Başlık en fazla 200 karakter olabilir."),
  description: optionalTrimmedString.nullish(),
  price: priceSchema,
  thumbnailUrl: optionalUrl.optional(),
});

export const updateCourseSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Başlık en az 3 karakter olmalıdır.")
      .max(200, "Başlık en fazla 200 karakter olabilir.")
      .optional(),
    description: optionalTrimmedString.nullish(),
    price: priceSchema.optional(),
    thumbnailUrl: optionalUrl.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Güncelleme için en az bir alan gönderilmelidir.",
  });

export function serializeCourse(course: {
  id: string;
  instructorId: string;
  title: string;
  description: string | null;
  price: { toString(): string };
  thumbnailUrl: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: course.id,
    instructorId: course.instructorId,
    title: course.title,
    description: course.description,
    price: course.price.toString(),
    thumbnailUrl: course.thumbnailUrl,
    isPublished: course.isPublished,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

export async function requireInstructor(request: Request) {
  const { user, error } = verifyToken(request);

  if (error) {
    return { error };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user?.userId },
    select: { id: true, role: true },
  });

  if (!dbUser) {
    return {
      error: NextResponse.json(
        { error: "Kullanıcı veritabanında bulunamadı." },
        { status: 404 },
      ),
    };
  }

  if (dbUser.role !== "INSTRUCTOR") {
    return {
      error: NextResponse.json(
        { error: "Bu işlem için eğitmen hesabı gereklidir." },
        { status: 403 },
      ),
    };
  }

  return { user: dbUser };
}

export async function findOwnedCourse(courseId: string, instructorId: string) {
  return prisma.course.findFirst({
    where: {
      id: courseId,
      instructorId,
    },
  });
}

const orderIndexSchema = z.preprocess((value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return value;
    return Number(trimmed);
  }
  return value;
}, z.number().int("Sıra değeri tam sayı olmalıdır."));

export const createSectionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Bölüm başlığı en az 2 karakter olmalıdır.")
    .max(160, "Bölüm başlığı en fazla 160 karakter olabilir."),
  orderIndex: orderIndexSchema,
});

export const updateSectionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Bölüm başlığı en az 2 karakter olmalıdır.")
      .max(160, "Bölüm başlığı en fazla 160 karakter olabilir.")
      .optional(),
    orderIndex: orderIndexSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Güncelleme için en az bir alan gönderilmelidir.",
  });

export function serializeSection(section: {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: section.id,
    courseId: section.courseId,
    title: section.title,
    orderIndex: section.orderIndex,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
  };
}

export async function findOwnedSection(
  sectionId: string,
  courseId: string,
  instructorId: string,
) {
  return prisma.courseSection.findFirst({
    where: {
      id: sectionId,
      courseId,
      course: {
        instructorId,
      },
    },
  });
}

export function isDuplicateSectionOrderIndexError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

const durationSchema = z.preprocess((value) => {
  if (value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    return Number(trimmed);
  }
  return value;
}, z.number().int("Süre tam sayı olmalıdır.").min(0, "Süre 0 veya daha büyük olmalıdır.").nullable());

export const createLessonSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Ders başlığı en az 2 karakter olmalıdır.")
    .max(200, "Ders başlığı en fazla 200 karakter olabilir."),
  duration: durationSchema.optional(),
  orderIndex: orderIndexSchema,
});

export const updateLessonSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Ders başlığı en az 2 karakter olmalıdır.")
      .max(200, "Ders başlığı en fazla 200 karakter olabilir.")
      .optional(),
    duration: durationSchema.optional(),
    orderIndex: orderIndexSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Güncelleme için en az bir alan gönderilmelidir.",
  });

export function serializeLesson(lesson: {
  id: string;
  courseId: string;
  sectionId: string;
  title: string;
  duration: number | null;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
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
  };
}

export async function findOwnedLesson(
  lessonId: string,
  courseId: string,
  sectionId: string,
  instructorId: string,
) {
  return prisma.lesson.findFirst({
    where: {
      id: lessonId,
      courseId,
      sectionId,
      course: {
        instructorId,
      },
    },
  });
}

export function isDuplicateLessonOrderIndexError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

const lessonContentTypeSchema = z.enum([
  "VIDEO_URL",
  "UPLOADED_VIDEO",
  "PDF",
  "TEXT",
  "ASSIGNMENT_FILE",
  "ASSIGNMENT_TEXT",
]);

const optionalNonEmptyTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z.string().trim().min(1).nullable(),
);

const optionalMimeType = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z.string().trim().max(255, "MIME type en fazla 255 karakter olabilir.").nullable(),
);

const contentDurationSchema = z.preprocess((value) => {
  if (value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    return Number(trimmed);
  }
  return value;
}, z.number().int("Süre tam sayı olmalıdır.").min(0, "Süre 0 veya daha büyük olmalıdır.").nullable());

type LessonContentValidationInput = {
  contentType: z.infer<typeof lessonContentTypeSchema>;
  assetUrl?: string | null;
  textContent?: string | null;
};

type LessonContentIssue = {
  code?: "custom";
  path: string[];
  message: string;
};

function validateLessonContentTypeFields(
  value: LessonContentValidationInput,
  addIssue: (issue: LessonContentIssue) => void,
) {
  const issues = collectLessonContentTypeIssues(value);

  for (const issue of issues) {
    addIssue(issue);
  }
}

export const createLessonContentSchema = z
  .object({
    contentType: lessonContentTypeSchema,
    title: optionalTrimmedString.nullish(),
    assetUrl: optionalUrl.optional(),
    textContent: optionalNonEmptyTrimmedString.optional(),
    mimeType: optionalMimeType.optional(),
    duration: contentDurationSchema.optional(),
    orderIndex: orderIndexSchema,
  })
  .superRefine((value, ctx) =>
    validateLessonContentTypeFields(value, (issue) =>
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: issue.path,
        message: issue.message,
      }),
    ),
  );

export const updateLessonContentSchema = z
  .object({
    contentType: lessonContentTypeSchema.optional(),
    title: optionalTrimmedString.nullish(),
    assetUrl: optionalUrl.optional(),
    textContent: optionalNonEmptyTrimmedString.optional(),
    mimeType: optionalMimeType.optional(),
    duration: contentDurationSchema.optional(),
    orderIndex: orderIndexSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Güncelleme için en az bir alan gönderilmelidir.",
  });

export function validateUpdatedLessonContentPayload(
  existingContent: {
    contentType: z.infer<typeof lessonContentTypeSchema>;
    assetUrl: string | null;
    textContent: string | null;
  },
  updatePayload: z.infer<typeof updateLessonContentSchema>,
) {
  const mergedValue = {
    contentType: updatePayload.contentType ?? existingContent.contentType,
    assetUrl:
      updatePayload.assetUrl !== undefined
        ? updatePayload.assetUrl
        : existingContent.assetUrl,
    textContent:
      updatePayload.textContent !== undefined
        ? updatePayload.textContent
        : existingContent.textContent,
  };

  const issues: z.ZodIssue[] = [];
  validateLessonContentTypeFields(mergedValue, (issue) => {
    issues.push({
      code: z.ZodIssueCode.custom,
      path: issue.path,
      message: issue.message,
    });
  });

  if (issues.length > 0) {
    return {
      success: false as const,
      error: new z.ZodError(issues),
    };
  }

  return { success: true as const };
}

export function serializeLessonContent(content: {
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

export async function findOwnedLessonContent(
  contentId: string,
  lessonId: string,
  courseId: string,
  sectionId: string,
  instructorId: string,
) {
  return prisma.lessonContent.findFirst({
    where: {
      id: contentId,
      lessonId,
      lesson: {
        id: lessonId,
        courseId,
        sectionId,
        course: {
          instructorId,
        },
      },
    },
  });
}

export function isDuplicateLessonContentOrderIndexError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

type CoursePublishReadinessResult =
  | {
      success: true;
      course: Awaited<ReturnType<typeof findOwnedCourse>>;
      issues: [];
    }
  | {
      success: false;
      course: Awaited<ReturnType<typeof findOwnedCourse>>;
      issues: string[];
    };

export async function validateCoursePublishReadiness(
  courseId: string,
  instructorId: string,
): Promise<CoursePublishReadinessResult> {
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      instructorId,
    },
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        include: {
          lessons: {
            orderBy: { orderIndex: "asc" },
            include: {
              _count: {
                select: {
                  contents: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    return {
      success: false,
      course: null,
      issues: ["Kurs bulunamadı."],
    };
  }

  const issues = collectCoursePublishIssues({
    title: course.title,
    description: course.description,
    thumbnailUrl: course.thumbnailUrl,
    sections: course.sections.map((section) => ({
      lessons: section.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        contentCount: lesson._count.contents,
      })),
    })),
  });

  if (issues.length > 0) {
    return {
      success: false,
      course,
      issues,
    };
  }

  return {
    success: true,
    course,
    issues: [],
  };
}
