import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password || password.length < 6) {
      return NextResponse.json({ error: "Geçersiz istek. Şifre en az 6 karakter olmalıdır." }, { status: 400 });
    }

    const secret = process.env.JWT_SECRET!;
    let payload: { userId: string; email: string; purpose: string };

    try {
      payload = jwt.verify(token, secret) as typeof payload;
    } catch {
      return NextResponse.json({ error: "Sıfırlama bağlantısı geçersiz veya süresi dolmuş." }, { status: 400 });
    }

    if (payload.purpose !== "password-reset") {
      return NextResponse.json({ error: "Geçersiz token." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash },
    });

    return NextResponse.json({ message: "Şifreniz başarıyla güncellendi." });
  } catch (err) {
    console.error("Şifre güncelleme hatası:", err);
    return NextResponse.json({ error: "Bir hata oluştu. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
