import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim. Sadece adminler bu işlemi yapabilir." }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    });

    return NextResponse.json(users);
  } catch (err) {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim. Sadece adminler kullanıcı oluşturabilir." }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, fullName, role } = body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Bu e-posta kullanımda." }, { status: 409 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName,
        role: role || "STUDENT",
      },
    });

    const { passwordHash, ...userWithoutPassword } = newUser;
    return NextResponse.json({ message: "Kullanıcı oluşturuldu", user: userWithoutPassword }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
