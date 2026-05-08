/**
 * Uploads a file to Supabase Storage via the Next.js proxy route.
 * Supabase free-plan hard limit: 50 MB per file.
 */
export const UPLOAD_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
export const UPLOAD_MAX_LABEL = "50 MB";

export async function uploadFileToStorage(file: File, token: string): Promise<string> {
  if (file.size > UPLOAD_MAX_BYTES) {
    throw new Error(`Dosya ${UPLOAD_MAX_LABEL}'dan büyük olamaz. Daha büyük videolar için URL seçeneğini kullanın.`);
  }

  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Yükleme başarısız.");

  return json.url as string;
}
