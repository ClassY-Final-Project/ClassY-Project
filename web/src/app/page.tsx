"use client";

import { PDFUploader } from "@/components/pdf-processor/PDFUploader";
import { PDFProcessor } from "@/components/pdf-processor/PDFProcessor";
import { useState } from "react";
import { BookOpen } from "lucide-react";

export default function Home() {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("course-101");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">ClassY AI</h1>
          </div>
          <p className="text-gray-600">PDF Tabanlı Ders Notu ve Quiz Sistemi</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Step 1: Upload PDF */}
          <div className="order-1 md:order-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                1
              </div>
              <h2 className="text-lg font-semibold text-gray-800">PDF Yükle</h2>
            </div>
            <PDFUploader 
              courseId={selectedCourseId}
              onUploadSuccess={(courseId) => setSelectedCourseId(courseId)}
            />
          </div>

          {/* Step 2: Process Content */}
          <div className="order-2 md:order-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                2
              </div>
              <h2 className="text-lg font-semibold text-gray-800">
                İçeriği İşle
              </h2>
            </div>
            <PDFProcessor courseId={selectedCourseId} />
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800 mb-2">📁 Nasıl Çalışır?</h3>
            <p className="text-sm text-gray-600">
              1. PDF dosyasını yükleyin, 2. Ders ID belirleyin, 3. AI sistemi otomatik olarak indexleme yapacak.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800 mb-2">📝 Özet Oluştur</h3>
            <p className="text-sm text-gray-600">
              Yüklediğiniz PDF&apos;den otomatik olarak kısa ve özlü bir özet oluştur. Hızlı öğrenme için ideal.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800 mb-2">🧠 Quiz Oluştur</h3>
            <p className="text-sm text-gray-600">
              10 soruluk bir quiz oluşturun ve bilginizi test edin. AI tarafından otomatik olarak sorular hazırlanır.
            </p>
          </div>
        </div>

        {/* Requirements */}
        <div className="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Gereksinimler</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>✅ Ollama servisi çalışıyor mu? (localhost:11434)</li>
            <li>✅ Python AI Engine açık mı? (localhost:8000)</li>
            <li>✅ PDF dosyası yüklenmiş mi?</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
