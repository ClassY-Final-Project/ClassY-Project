import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// GET — bildirimler
export async function GET(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;

  const notifications = await prisma.notification.findMany({
    where: { userId: user!.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return NextResponse.json({ notifications, unreadCount });
}

// PATCH — tümünü okundu işaretle
export async function PATCH(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;

  await prisma.notification.updateMany({
    where: { userId: user!.userId, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
