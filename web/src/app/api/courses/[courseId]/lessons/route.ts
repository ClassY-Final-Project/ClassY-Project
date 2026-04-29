import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;

    if (user?.role !== "ADMIN" && user?.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Yetkisiz erişim. Sadece eğitmen veya admin ders ekleyebilir." }, { status: 403 });
    }

    return NextResponse.json({ message: "Not implemented" });
  } catch (err) {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return NextResponse.json({ message: "Not implemented" });
}
