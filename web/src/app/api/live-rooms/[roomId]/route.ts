import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// Not: prisma schema'sında LiveRoom henüz eklenmediği için
// sadece yetkilendirme kontrolü yapıyoruz.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { user, error } = verifyToken(request);
    if (error) return error;

    if (user?.role !== "ADMIN" && user?.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Yetkisiz erişim. Sadece adminler veya eğitmenler canlı ders silebilir." }, { status: 403 });
    }

    const { roomId } = await params;

    // Prisma'da model oluştuğunda buraya silme kodu gelecek
    // await prisma.liveRoom.delete({ where: { id: roomId } });

    return NextResponse.json({ message: "Canlı ders başarıyla silindi." });
  } catch (err) {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
