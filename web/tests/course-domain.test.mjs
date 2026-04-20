import assert from "node:assert/strict";
import {
  collectCoursePublishIssues,
  collectLessonContentTypeIssues,
} from "../src/app/api/courses/_domain.ts";

{
  const issues = collectLessonContentTypeIssues({
    contentType: "VIDEO_URL",
    assetUrl: null,
  });

  assert.deepEqual(issues, [
    {
      path: ["assetUrl"],
      message: "Bu içerik tipi için assetUrl zorunludur.",
    },
  ]);
}

{
  const issues = collectLessonContentTypeIssues({
    contentType: "TEXT",
    textContent: null,
  });

  assert.deepEqual(issues, [
    {
      path: ["textContent"],
      message: "Bu içerik tipi için textContent zorunludur.",
    },
  ]);
}

{
  const issues = collectLessonContentTypeIssues({
    contentType: "PDF",
    assetUrl: "https://cdn.example.com/file.pdf",
  });

  assert.deepEqual(issues, []);
}

{
  const issues = collectCoursePublishIssues({
    title: "React Temelleri",
    description: null,
    thumbnailUrl: null,
    sections: [],
  });

  assert.deepEqual(issues, [
    "description eksik",
    "thumbnailUrl eksik",
    "en az bir bölüm gerekli",
    "en az bir ders gerekli",
  ]);
}

{
  const issues = collectCoursePublishIssues({
    title: "React Temelleri",
    description: "Başlangıç seviyesi kurs",
    thumbnailUrl: "https://cdn.example.com/course.png",
    sections: [
      {
        lessons: [
          {
            id: "lesson-1",
            title: "Kurulum",
            contentCount: 0,
          },
        ],
      },
    ],
  });

  assert.deepEqual(issues, [
    'lesson "Kurulum" için en az bir içerik gerekli',
  ]);
}

{
  const issues = collectCoursePublishIssues({
    title: "React Temelleri",
    description: "Başlangıç seviyesi kurs",
    thumbnailUrl: "https://cdn.example.com/course.png",
    sections: [
      {
        lessons: [
          {
            id: "lesson-1",
            title: "Kurulum",
            contentCount: 1,
          },
        ],
      },
    ],
  });

  assert.deepEqual(issues, []);
}

console.log("course-domain tests passed");
