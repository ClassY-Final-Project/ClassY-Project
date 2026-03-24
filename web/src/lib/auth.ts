import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

// JWT içindeki verinin (Payload) tipini tanımlıyoruz
export interface AuthPayload {
  userId: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
}

export function verifyToken(request: Request): {
  user?: AuthPayload;
  error?: NextResponse;
} {
  try {
    // 1. İsteğin başlığındaki (Headers) "Authorization" kısmını al
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        error: NextResponse.json(
          { error: "Yetkisiz erişim. Token eksik." },
          { status: 401 },
        ),
      };
    }

    // 2. "Bearer eyJhbGci..." şeklindeki metinden sadece token kısmını ayır
    const token = authHeader.split(" ")[1];

    // 3. .env dosyasındaki gizli anahtarımızla token'ın sahte olup olmadığını kontrol et
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
      throw new Error("JWT_SECRET bulunamadı.");
    }

    // 4. Token geçerliyse içindeki bilgileri (userId, role) çıkar
    const decoded = jwt.verify(token, secretKey) as AuthPayload;

    return { user: decoded };
  } catch (error) {
    // Token'ın süresi dolmuşsa veya kurcalanmışsa
    return {
      error: NextResponse.json(
        { error: "Geçersiz veya süresi dolmuş token." },
        { status: 401 },
      ),
    };
  }
}
