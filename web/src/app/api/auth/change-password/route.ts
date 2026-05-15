import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Oturum açmış kullanıcının şifresini değiştirir
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 */
export async function POST(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword) {
    return NextResponse.json(
      { error: "Mevcut şifrenizi girin." },
      { status: 400 },
    );
  }
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { error: "Yeni şifre en az 6 karakter olmalıdır." },
      { status: 400 },
    );
  }
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "Yeni şifreniz mevcut şifrenizle aynı olamaz." },
      { status: 400 },
    );
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
    });
    if (!dbUser) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı." },
        { status: 404 },
      );
    }

    const ok = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Mevcut şifreniz yanlış." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { passwordHash },
    });

    return NextResponse.json({ message: "Şifreniz başarıyla güncellendi." });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json(
      { error: "Şifre değiştirilemedi. Lütfen tekrar deneyin." },
      { status: 500 },
    );
  }
}
