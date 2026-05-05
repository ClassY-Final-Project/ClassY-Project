import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/study-rooms — Tüm odaları listele (aktif + kapalı)
export async function GET(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "active";

    const where: any = filter === "all" ? {} : { isActive: filter === "active" };

    const rooms = await (prisma as any).studyRoom.findMany({
      where,
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ rooms });
  } catch (err) {
    console.error("Admin study rooms GET hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
