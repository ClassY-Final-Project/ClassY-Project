export type CoursePublishLessonInput = {
  id: string;
  title: string;
  contentCount: number;
};

export type CoursePublishSectionInput = {
  lessons: CoursePublishLessonInput[];
};

export type CoursePublishValidationInput = {
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  sections: CoursePublishSectionInput[];
};

export type LessonContentRuleInput = {
  contentType:
    | "VIDEO_URL"
    | "UPLOADED_VIDEO"
    | "PDF"
    | "TEXT"
    | "ASSIGNMENT_FILE"
    | "ASSIGNMENT_TEXT";
  assetUrl?: string | null;
  textContent?: string | null;
};

export function collectCoursePublishIssues(
  course: CoursePublishValidationInput,
) {
  const issues: string[] = [];

  if (!course.title || course.title.trim().length === 0) {
    issues.push("title eksik");
  }

  if (!course.description || course.description.trim().length === 0) {
    issues.push("description eksik");
  }

  if (!course.thumbnailUrl || course.thumbnailUrl.trim().length === 0) {
    issues.push("thumbnailUrl eksik");
  }

  if (course.sections.length === 0) {
    issues.push("en az bir bölüm gerekli");
  }

  const allLessons = course.sections.flatMap((section) => section.lessons);

  if (allLessons.length === 0) {
    issues.push("en az bir ders gerekli");
  }

  for (const lesson of allLessons) {
    if (!lesson.title || lesson.title.trim().length === 0) {
      issues.push(`lesson "${lesson.id}" title eksik`);
    }

    if (lesson.contentCount === 0) {
      issues.push(`lesson "${lesson.title || lesson.id}" için en az bir içerik gerekli`);
    }
  }

  return issues;
}

export function collectLessonContentTypeIssues(
  value: LessonContentRuleInput,
) {
  const issues: Array<{ path: string[]; message: string }> = [];

  const requiresAssetUrl =
    value.contentType === "VIDEO_URL" ||
    value.contentType === "UPLOADED_VIDEO" ||
    value.contentType === "PDF" ||
    value.contentType === "ASSIGNMENT_FILE";

  const requiresTextContent =
    value.contentType === "TEXT" ||
    value.contentType === "ASSIGNMENT_TEXT";

  if (requiresAssetUrl && !value.assetUrl) {
    issues.push({
      path: ["assetUrl"],
      message: "Bu içerik tipi için assetUrl zorunludur.",
    });
  }

  if (requiresTextContent && !value.textContent) {
    issues.push({
      path: ["textContent"],
      message: "Bu içerik tipi için textContent zorunludur.",
    });
  }

  return issues;
}
