import { NextRequest, NextResponse } from "next/server";

const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const { courseId, maxLength } = await request.json();

    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    const response = await fetch(`${AI_ENGINE_URL}/api/summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        course_id: courseId,
        max_length: maxLength || 500,
      }),
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse summary response:", responseText);
      return NextResponse.json(
        { error: `Server error: Invalid response from AI Engine` },
        { status: 500 }
      );
    }

    if (!response.ok) {
      throw new Error(data.detail || data.error || "Summary generation failed");
    }

    if (!data.success) {
      throw new Error(data.error || "Summary generation failed");
    }

    return NextResponse.json({
      success: true,
      summary: data.summary,
    });
  } catch (error) {
    console.error("Summary error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Summary generation failed" },
      { status: 500 }
    );
  }
}