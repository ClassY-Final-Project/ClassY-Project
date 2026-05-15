import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { sendMail, isMailConfigured } from "@/lib/mailer";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Geçerli bir e-posta adresi girin." },
        { status: 400 },
      );
    }

    // Kullanıcı var mı kontrol et (güvenlik için aynı mesajı döndürüyoruz)
    const user = await prisma.user.findUnique({ where: { email } });

    let resetUrl = "";
    let mailSent = false;

    if (user) {
      const secret = process.env.JWT_SECRET!;
      const resetToken = jwt.sign(
        { userId: user.id, email: user.email, purpose: "password-reset" },
        secret,
        { expiresIn: "1h" },
      );

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

      const subject = "ClassY - Şifre Sıfırlama Bağlantınız";
      const text = `Merhaba,

ClassY hesabınız için bir şifre sıfırlama isteği aldık. Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın (1 saat geçerli):

${resetUrl}

Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.

ClassY Ekibi`;
      const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#18181b">
  <h2 style="margin:0 0 16px">Şifre Sıfırlama</h2>
  <p>Merhaba,</p>
  <p>ClassY hesabınız için bir şifre sıfırlama isteği aldık. Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz. Bağlantı <b>1 saat</b> geçerlidir.</p>
  <p style="margin:24px 0">
    <a href="${resetUrl}" style="background:#4f46e5;color:white;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">Şifremi Sıfırla</a>
  </p>
  <p style="font-size:12px;color:#71717a">Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:<br/>${resetUrl}</p>
  <p style="font-size:12px;color:#71717a">Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>
</div>`;

      const result = await sendMail({ to: email, subject, text, html });
      mailSent = result.sent;

      if (!mailSent) {
        // SMTP yoksa veya başarısız olduysa, geliştirici için konsola yazdır
        console.log(`[ŞİFRE SIFIRLAMA] ${email} için bağlantı:\n${resetUrl}`);
      }
    }

    // Kullanıcı olsun olmasın aynı mesajı döndür (e-mail enumeration koruması)
    return NextResponse.json({
      message:
        "Eğer bu e-posta adresi kayıtlıysa, sıfırlama bağlantısı gönderildi.",
      // Sadece dev modunda ve SMTP kurulu DEĞİLse linki frontend'e ver (test için)
      debugUrl:
        process.env.NODE_ENV !== "production" && resetUrl && !isMailConfigured()
          ? resetUrl
          : undefined,
    });
  } catch (err) {
    console.error("Şifre sıfırlama hatası:", err);
    return NextResponse.json(
      { error: "Bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 },
    );
  }
}
