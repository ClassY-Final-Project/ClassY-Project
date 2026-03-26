"use client";

import { useState } from "react";
import { Upload, Loader, AlertCircle, CheckCircle } from "lucide-react";

interface UploadStatus {
  success?: boolean;
  error?: string;
  filename?: string;
  docCount?: number;
  courseId?: string;
}

interface PDFUploaderProps {
  courseId: string;
  onUploadSuccess?: (courseId: string) => void;
}

export function PDFUploader({ courseId, onUploadSuccess }: PDFUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<UploadStatus | null>(null);

  const buildUploadCourseId = (baseCourseId: string, fileName: string): string => {
    const fileSlug = fileName
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);

    const safeSlug = fileSlug.length > 0 ? fileSlug : "pdf";
    return `${baseCourseId}-${safeSlug}-${Date.now()}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setStatus(null);
    } else {
      setStatus({ error: "Lütfen PDF dosyası seçin" });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus({ error: "Lütfen bir PDF dosyası seçin" });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      const uploadCourseId = buildUploadCourseId(courseId, file.name);
      formData.append("file", file);
      formData.append("courseId", uploadCourseId);

      const response = await fetch("/api/ai/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus({ error: data.error || "Upload başarısız" });
      } else {
        const resolvedCourseId = data.courseId || uploadCourseId;
        setStatus({
          success: true,
          filename: data.filename,
          docCount: data.docCount,
          courseId: resolvedCourseId,
        });
        if (onUploadSuccess) {
          onUploadSuccess(resolvedCourseId);
        }
        setFile(null);
      }
    } catch (error) {
      setStatus({
        error: error instanceof Error ? error.message : "Bir hata oluştu",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">PDF Yükle</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          PDF Dosyası
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            id="pdf-input"
          />
          <label htmlFor="pdf-input" className="cursor-pointer">
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              {file ? file.name : "PDF dosyası seçmek için tıklayın"}
            </p>
          </label>
        </div>
      </div>

      {status?.error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded-md flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{status.error}</p>
        </div>
      )}

      {status?.success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 rounded-md flex gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="text-sm text-green-700">
            <p className="font-semibold">{status.filename} başarıyla yüklendi</p>
            <p className="text-xs">{status.docCount} belge indexlendi</p>
            {status.courseId && <p className="text-xs">Aktif içerik ID: {status.courseId}</p>}
          </div>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader className="animate-spin h-4 w-4" /> Yükleniyor...
          </>
        ) : (
          "Yükle"
        )}
      </button>
    </div>
  );
}
