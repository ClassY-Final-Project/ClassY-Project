import { NextRequest, NextResponse } from "next/server";

const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const courseId = (formData.get("courseId") || "course-101") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    // Create FormData for Python backend
    const pythonFormData = new FormData();
    pythonFormData.append("file", file);
    pythonFormData.append("course_id", courseId);

    // Upload to AI Engine
    const response = await fetch(`${AI_ENGINE_URL}/api/pdf/upload`, {
      method: "POST",
      body: pythonFormData,
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse response:", responseText);
      return NextResponse.json(
        { error: `Server error: Invalid response from AI Engine` },
        { status: 500 }
      );
    }

    if (!response.ok) {
      throw new Error(data.detail || data.error || "Upload failed");
    }

    return NextResponse.json({
      success: true,
      message: "PDF uploaded and indexed successfully",
      courseId: data.course_id || courseId,
      docCount: data.doc_count || 0,
      filename: data.filename || file.name,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}