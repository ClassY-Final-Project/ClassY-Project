import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });
    }

    // Kullanıcı var mı kontrol et (güvenlik için aynı mesajı döndürüyoruz)
    const user = await prisma.user.findUnique({ where: { email } });

    let resetToken = "";
    if (user) {
      // Şifre sıfırlama token'ı oluştur (1 saat geçerli)
      const secret = process.env.JWT_SECRET!;
      resetToken = jwt.sign(
        { userId: user.id, email: user.email, purpose: "password-reset" },
        secret,
        { expiresIn: "1h" }
      );

      // Gerçek bir uygulamada burada e-posta gönderilir.
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;
      console.log(`[ŞİFRE SIFIRLAMA] ${email} için bağlantı:\n${resetUrl}`);
    }

    // Kullanıcı olsun olmasın aynı mesajı döndür
    return NextResponse.json({
      message: "Eğer bu e-posta adresi kayıtlıysa, sıfırlama bağlantısı gönderildi.",
      debugUrl: process.env.NODE_ENV !== "production" && resetToken ? `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}` : undefined
    });
  } catch (err: any) {
    console.error("Şifre sıfırlama hatası:", err);
    return NextResponse.json({ error: "Bir hata oluştu. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
