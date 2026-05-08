import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { user, error } = verifyToken(req);
  if (error) return error;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ courses: [], instructors: [], studyRooms: [], liveRooms: [] });
  }

  const [courses, instructors, studyRooms, liveRooms] = await Promise.all([
    prisma.course.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        instructor: { select: { fullName: true, email: true } },
      },
      take: 5,
    }),
    prisma.user.findMany({
      where: {
        role: "INSTRUCTOR",
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { bio: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, fullName: true, email: true, bio: true, avatarUrl: true },
      take: 5,
    }),
    prisma.studyRoom.findMany({
      where: {
        isActive: true,
        isPrivate: false,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { topic: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, topic: true, type: true },
      take: 5,
    }),
    prisma.liveRoom.findMany({
      where: {
        status: { in: ["SCHEDULED", "LIVE"] },
        name: { contains: q, mode: "insensitive" },
      },
      select: {
        id: true,
        name: true,
        dailyRoomName: true,
        instructor: { select: { fullName: true } },
      },
      take: 5,
    }),
  ]);

  return NextResponse.json({ courses, instructors, studyRooms, liveRooms });
}
