# ⚡ Hızlı Başlangıç (5 dakika)

## 🚀 3 Terminal Açılmalı:

### Terminal 1: Ollama
```bash
ollama serve
```
→ `Loading "mistral"` göreceksin

### Terminal 2: Python API
```bash
cd c:\classY\ClassY-Project\ai-engine
venv\Scripts\activate
python main.py
```
→ `🚀 AI Engine starting on 127.0.0.1:8000` göreceksin

### Terminal 3: Next.js
```bash
cd c:\classY\ClassY-Project\web
npm run dev
```
→ `Ready in Xs` göreceksin

---

## ✅ Ready! 
Tarayıcıda aç: **[http://localhost:3000](http://localhost:3000)**

1. PDF yükle
2. "Özet" veya "Quiz" seç
3. Sonuç gözlemle

---

## 🆘 Hata Alırsan?

**"Connection refused localhost:11434"**
→ Terminal 1'de `ollama serve` çalışmıyor, başlat

**"Module not found: llama-index"**
→ Terminal 2'de `pip install -r requirements.txt` çalıştır

**"Cannot POST /api/ai/upload"**
→ Terminal 2'de Python API çalışmıyor, kontrol et

---

## 📝 İlk Test PDF'i

`ai-engine/data/courses/default/` klasörüne bir PDF koy, sonra:
1. localhost:3000 aç
2. Ders ID: "default"
3. "Özet Oluştur" tıkla
4. 30 saniye bekle → Sonuç göreceksin

Sorun?
- [SETUP_GUIDE.md](SETUP_GUIDE.md) oku (detaylı rehber)
- Terminal logs kontrol et
