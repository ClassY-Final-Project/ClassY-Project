import { NextRequest, NextResponse } from "next/server";

const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
	try {
		const { courseId, topic, count } = await request.json();

		if (!courseId) {
			return NextResponse.json({ error: "courseId is required" }, { status: 400 });
		}

		const response = await fetch(`${AI_ENGINE_URL}/api/quiz/generate`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				course_id: courseId,
				topic: topic || null,
				count: count || 10,
			}),
		});

		const responseText = await response.text();
		let data;

		try {
			data = JSON.parse(responseText);
		} catch {
			console.error("Failed to parse quiz generate response:", responseText);
			return NextResponse.json(
				{ error: "Server error: Invalid response from AI Engine" },
				{ status: 500 }
			);
		}

		if (!response.ok) {
			throw new Error(data.detail || data.error || "Quiz generation failed");
		}

		return NextResponse.json({
			success: true,
			questions: data.questions || [],
			count: data.count || 0,
		});
	} catch (error) {
		console.error("Quiz generate error:", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Quiz generation failed" },
			{ status: 500 }
		);
	}
}
