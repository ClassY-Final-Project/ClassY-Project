import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth"; // Az önce yazdığımız güvenlik görevlisi

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
