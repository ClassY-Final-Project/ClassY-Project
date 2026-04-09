import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

// 1. Gelen veri formatını belirliyoruz (Sadece email ve şifre yeterli)
const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  password: z.string().min(1, "Şifre alanı boş bırakılamaz."),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Doğrulama hatası", details: validation.error.format() },
        { status: 400 },
      );
    }

    const { email, password } = validation.data;

    // 2. Veritabanında bu e-posta ile kayıtlı bir kullanıcı var mı?
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Güvenlik: "Kullanıcı bulunamadı" demek yerine genel bir hata mesajı verilir
      // (Kötü niyetli kişilerin sistemde hangi maillerin kayıtlı olduğunu bulmasını engeller)
      return NextResponse.json(
        { error: "E-posta veya şifre hatalı." },
        { status: 401 }, // 401 Unauthorized
      );
    }

    // 3. Şifreler eşleşiyor mu? (Gelen düz şifre ile veritabanındaki hash'lenmiş şifreyi karşılaştır)
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "E-posta veya şifre hatalı." },
        { status: 401 },
      );
    }

    // 4. Şifre doğruysa JWT Token oluştur (Yaka kartı)
    // Token'ın içine kullanıcının ID'sini ve Rolünü koyuyoruz ki sonraki işlemlerde kim olduğunu bilelim
    const tokenPayload = {
      userId: user.id,
      role: user.role,
    };

    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
      throw new Error("JWT_SECRET .env dosyasında bulunamadı.");
    }

    // Token'ı 7 gün geçerli olacak şekilde imzalıyoruz
    const token = jwt.sign(tokenPayload, secretKey, { expiresIn: "7d" });

    // 5. Şifreyi yine ayıklayıp, frontend'e token ile birlikte gönder
    const { passwordHash, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        message: "Giriş başarılı.",
        token: token,
        user: userWithoutPassword,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Login API Hatası:", error);
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 },
    );
  }
}
