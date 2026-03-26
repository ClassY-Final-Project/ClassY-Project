# ClassY AI - Başlangıç Kılavuzu

## 🚀 Başlamadan Önce Kontrol Edilmesi Gerekenler

1. **Ollama Kurulu mu?** → Eğer yoksa [ollama.ai](https://ollama.ai) indir
2. **PostgreSQL Çalışıyor mu?** → `psql --version` kontrol et
3. **Python 3.10+** → `python --version` kontrol et
4. **Node.js 18+** → `node --version` kontrol et

---

## 📋 Adım Adım Başlatma

### Adım 1: Ollama Modelleri İndir (1. Terminal)
```bash
ollama pull nomic-embed-text
ollama pull mistral
```

Kurulum bittikten sonra:
```bash
ollama serve
```

✅ Ollama localhost:11434'de çalışmaya başlayacak

---

### Adım 2: Python Backend Başlat (2. Terminal)
```bash
cd c:\classY\ClassY-Project\ai-engine

# Virtual environment oluştur
python -m venv venv

# Aktifleştir
venv\Scripts\activate

# Paketleri kur
pip install -r requirements.txt

# API'yi başlat
python main.py
```

✅ FastAPI localhost:8000'de çalışmaya başlayacak

Eğer hata alırsan:
```bash
# LlamaIndex versiyonunu kontrol et
pip install --upgrade llama-index
```

---

### Adım 3: Next.js Başlat (3. Terminal)
```bash
cd c:\classY\ClassY-Project\web

# Paketleri kur (ilk defa)
npm install

# Development server'ı başlat
npm run dev
```

✅ Frontend localhost:3000'de açılacak

---

## 🧪 Test Et

### 1. Ollama Çalışıyor mu?
```bash
curl http://localhost:11434/api/tags
```

Cikti örneği:
```json
{
  "models": [
    {"name": "nomic-embed-text:latest"},
    {"name": "mistral:latest"}
  ]
}
```

### 2. Python API Çalışıyor mu?
```bash
curl http://localhost:8000/health
```

### 3. Frontend Çalışıyor mu?
Tarayıcıda açılsın: [http://localhost:3000](http://localhost:3000)

---

## 📂 Folder Yapısı

```
ClassY-Project/
├── ai-engine/          # Python Backend
│   ├── main.py         # FastAPI app
│   ├── config.py       # Konfigürasyon
│   ├── services/
│   │   └── llama_service.py   # LlamaIndex logic
│   ├── data/
│   │   └── courses/    # PDF dosyaları buraya gelir
│   ├── indices/        # Cached indices
│   ├── requirements.txt
│   └── .env
│
└── web/                # Next.js Frontend
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx        # Ana sayfa
    │   │   └── api/ai/         # API routes
    │   │       ├── upload.ts
    │   │       ├── search.ts
    │   │       ├── quiz.ts
    │   │       └── summary.ts
    │   └── components/
    │       └── pdf-processor/  # React components
    │           ├── PDFUploader.tsx
    │           └── PDFProcessor.tsx
    └── package.json
```

---

## 🛠️ Sorun Giderme

### "Ollama bağlantısı reddedildi"
```
❌ Ollama çalışmıyor
✅ Çözüm: ollama serve komutunu çalıştır
```

### "Quiz boş döndü"
```
❌ LlamaIndex PDF'den metin almadı
✅ Çözüm: PDF'nin "metin tabanı" olduğunu kontrol et (scanned PDF değil)
```

### "Upload başarısız"
```
❌ Next.js ← Python API iletişim yok
✅ Çözüm: 
   - Python API kontrol et: curl localhost:8000/health
   - CORS ayarları kontrol et (main.py'de var)
```

### "Quiz soruları kötü kalite"
```
❌ Mistral modeli çok basit çıktı veriyor
✅ Çözüm: .env'de ollama.ai sitesinden başka model seç
   - neural-chat (daha hızlı)
   - openhermes (daha kaliteli ama yavaş)
```

---

## 🔧 Environment Variables (.env)

**ai-engine/.env** dosyası zaten oluşturulmuş:
```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_LLM_MODEL=mistral
DATABASE_URL=postgresql://postgres:password@localhost:5432/classy
API_PORT=8000
```

Eğer PORT değiştirmek istersen, .env dosyasını düzenle.

---

## 💡 Kullanım Örneği

1. **Tarayıcı açılsın**: [http://localhost:3000](http://localhost:3000)
2. **PDF Seç**: "Sample Biology.pdf" yükle
3. **Ders ID Belirt**: "biology-101"
4. **Yükle**: "Yükle" butonuna tıkla
5. **İşlem Seç**: "Özet Oluştur" veya "Quiz Oluştur"
6. **Sonuç Gözlemle**: 30-60 saniye beklemeyi unutma (LLM'in yanıt vermesi gerekli)

---

## ⚡ Performans İpuçları

- **İlk çalıştırma yavaş?** → LLM modelleri ilk kez yükleniyor, sonraki çalıştırmalar hızlı olacak
- **PDF indexing yavaş?** → PDF boyutu ne kadar büyükse, indexing o kadar yavaş (normal)
- **Quiz sorular basit?** → Mistral 7B seçilen model; daha iyisi için `neural-chat` dene
- **RAM yetersiz?** → Tüm uygulamaları aynı anda açma. Sırasıyla başlat

---

## 🔍 Debugging

### Logs Kontrol Et
```bash
# Python backend logs okup (terminal 2'de açıktır)
# → FastAPI requests göreceksin

# Next.js logs (terminal 3'te açıktır)
# → API calls göreceksin
```

### Database İçeriği Kontrol Et
```bash
psql -U postgres -d classy
classy=> SELECT * FROM "StudyNote" LIMIT 5;
```

---

## ✅ Checklist

- [ ] Ollama kurulu ve `ollama serve` çalışıyor
- [ ] Python backend `python main.py` çalışıyor (port 8000)
- [ ] Next.js `npm run dev` çalışıyor (port 3000)
- [ ] PostgreSQL bağlantı URL doğru
- [ ] `.env` dosyası mevcut ve doldurulmuş
- [ ] PDF dosyaları `ai-engine/data/courses/` klasöründe

---

## 🎯 Sonraki Adımlar

1. Sistem test ettikten sonra, login/authentication bileşenleri ekleyebilirsin
2. Database'ye quiz sonuçlarını kaydetmek için Prisma migration yapabilirsin
3. Admin dashboard ekleyebilirsin (istatistikler, raporlar vb.)
4. Veritabanında PDF/Quiz history tutabilirsin

---

**İhtiyacın olursa bana sor! 🚀**
