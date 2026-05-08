import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth"; // Az önce yazdığımız güvenlik görevlisi

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Geçerli kullanıcının (oturum) bilgilerini getirir
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Oturum geçerli, kullanıcı verisi döner
 *       401:
 *         description: Geçersiz veya eksik token
 *       404:
 *         description: Kullanıcı veritabanında bulunamadı
 *       500:
 *         description: Sunucu tarafında hata
 */
export async function GET(request: Request) {
  try {
    // 1. İstekle birlikte gelen Token'ı doğrula
    // Eğer token yoksa, bozuksa veya süresi dolmuşsa 'error' dolu gelir
    const { user, error } = verifyToken(request);

    if (error) {
      // Güvenlik görevlisi kişiyi içeri almadı, doğrudan hatayı Frontend'e yolla
      return error;
    }

    // 2. Token geçerliyse, içinden çıkan ID ile veritabanına git
    // user?.userId ifadesi, token'ın içinden çıkardığımız benzersiz kimliktir
    const dbUser = await prisma.user.findUnique({
      where: { id: user?.userId },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "Kullanıcı veritabanında bulunamadı." },
        { status: 404 },
      );
    }

    // 3. Her ihtimale karşı şifre hash'ini yine ayıkla (Frontend'e asla gitmemeli)
    const { passwordHash, ...safeUser } = dbUser;

    // 4. Kullanıcının tüm profil bilgilerini başarıyla dön
    return NextResponse.json(
      {
        message: "Oturum geçerli.",
        user: safeUser,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("ME API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  try {
    const body = await request.json();
    const updateData: { fullName?: string; bio?: string; avatarUrl?: string } = {};
    if (typeof body.fullName === "string") updateData.fullName = body.fullName.trim();
    if (typeof body.bio === "string") updateData.bio = body.bio.trim();
    if (typeof body.avatarUrl === "string") updateData.avatarUrl = body.avatarUrl;

    const updated = await prisma.user.update({ where: { id: user.userId }, data: updateData });
    const { passwordHash, ...safeUser } = updated;
    return NextResponse.json({ user: safeUser });
  } catch (err) {
    console.error("PATCH ME error:", err);
    return NextResponse.json({ error: "Güncellenemedi." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  try {
    await prisma.user.delete({ where: { id: user.userId } });
    return NextResponse.json({ message: "Hesap silindi." });
  } catch (err) {
    console.error("Delete account error:", err);
    return NextResponse.json({ error: "Hesap silinemedi." }, { status: 500 });
  }
}
