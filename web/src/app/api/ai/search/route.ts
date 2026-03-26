import { NextRequest, NextResponse } from "next/server";

const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const { query, courseId, limit } = await request.json();

    if (!query || !courseId) {
      return NextResponse.json({ error: "query and courseId are required" }, { status: 400 });
    }

    const response = await fetch(`${AI_ENGINE_URL}/api/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        course_id: courseId,
        limit: limit || 3,
      }),
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse search response:", responseText);
      return NextResponse.json(
        { error: `Server error: Invalid response from AI Engine` },
        { status: 500 }
      );
    }

    if (!response.ok) {
      throw new Error(data.detail || data.error || "Search failed");
    }

    return NextResponse.json({
      success: true,
      results: data.results,
      count: data.count,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}