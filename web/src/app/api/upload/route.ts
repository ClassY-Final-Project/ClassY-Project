import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BUCKET = "course-content";

async function ensureBucket() {
  await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
}

export async function POST(request: Request) {
  const { user, error } = verifyToken(request);
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });

  const maxSize = 500 * 1024 * 1024; // 500 MB
  if (file.size > maxSize) return NextResponse.json({ error: "Dosya 500 MB'dan büyük olamaz." }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const fileName = `${user!.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  await ensureBucket();

  const buffer = await file.arrayBuffer();
  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error("Supabase Storage hatası:", err);
    return NextResponse.json({ error: "Dosya yüklenemedi." }, { status: 500 });
  }

  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
  return NextResponse.json({ url });
}
