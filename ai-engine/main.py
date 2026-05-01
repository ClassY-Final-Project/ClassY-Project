from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
import os
from dotenv import load_dotenv
import PyPDF2
import io
import json

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY bulunamadı! Lütfen .env dosyasını kontrol edin.")

client = genai.Client(api_key=api_key)

app = FastAPI(title="ClassY AI Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptRequest(BaseModel):
    text: str

@app.get("/")
def read_root():
    return {"status": "success", "message": "ClassY AI Engine Çalışıyor!"}

# -- GEMINI TEST --
#@app.post("/ask-gemini")
#def ask_gemini(request: PromptRequest):
#    try:
#        response = client.models.generate_content(
#            model='gemini-2.0-flash-lite',
#            contents=request.text
#        )
#        return {"status": "success", "answer": response.text}
#    except Exception as e:
#        print(f"\n--- HATA DETAYI ---\n{str(e)}\n-------------------\n")
#        raise HTTPException(status_code=500, detail=str(e))

# -- QUIZ OLUŞTURMA BÖLÜMÜ --

@app.post("/generate-quiz")
async def generate_quiz(
    file: UploadFile = File(...), 
    question_count: int = Form(10) # Dışarıdan gelmezse varsayılan 10 soru üretir
):
    try:
        # Soru sayısı kısıtlaması (10 ile 20 arası)
        if not 10 <= question_count <= 20:
            raise HTTPException(status_code=400, detail="Soru sayısı 10 ile 20 arasında olmalıdır.")

        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Sadece PDF kabul edilmektedir.")
            
        contents = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(contents))
        extracted_text = "".join([page.extract_text() for page in pdf_reader.pages if page.extract_text()])
        
        # PROMPT İÇİNDE SAYIYI DİNAMİKLEŞTİRDİK
        prompt = f"""
        Sen üniversite seviyesinde uzman bir profesörsün.
        Aşağıda sana verilen ders notlarını dikkatlice oku ve bu notlardan öğrencilerin
        bilgisini ölçecek zorlayıcı {question_count} adet çoktan seçmeli soru hazırla.

        ÇOK ÖNEMLİ DİL KURALI:
        Ders notları hangi dilde yazılmışsa (örneğin İngilizce, Türkçe vb.), üreteceğin sorular,
        şıklar ve cevaplar da KESİNLİKLE metnin orijinal dilinde olmalıdır. Metni başka bir dile çevirme!

        KURALLAR:
        1. Sadece notlardaki bilgilere sadık kal.
        2. Yanıtını KESİNLİKLE sadece aşağıdaki JSON formatında ver, başka hiçbir metin ekleme.
        3. Tam olarak {question_count} adet soru ürettiğinden emin ol.
        4. "subject" alanında bu notların ders adını/konusunu kısa ve öz yaz (ör: Matematik, Fizik, Tarih - notların dilinde).

        İstenen JSON Formatı:
        {{
          "subject": "Bu notların ders adı/konusu",
          "quiz": [
            {{
              "question": "Soru metni buraya",
              "options": ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı"],
              "answer": "Doğru olan şıkkın tam metni"
            }}
          ]
        }}

        İşte Ders Notları:
        {extracted_text}
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )

        # JSON temizleme işlemini daha sağlam hale getirelim
        content_text = response.text
        if "```json" in content_text:
            clean_text = content_text.split("```json")[1].split("```")[0].strip()
        elif "```" in content_text:
            clean_text = content_text.split("```")[1].split("```")[0].strip()
        else:
            clean_text = content_text.strip()

        parsed = json.loads(clean_text)
        # Eski format (düz dizi) ile geriye dönük uyumluluk
        if isinstance(parsed, list):
            quiz_data = parsed
            subject = "Genel"
        else:
            quiz_data = parsed.get("quiz", [])
            subject = parsed.get("subject", "Genel")

        return {
            "status": "success",
            "source_file": file.filename,
            "subject": subject,
            "requested_count": question_count,
            "actual_count": len(quiz_data),
            "quiz": quiz_data
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Yapay zeka soruları üretti ama istenen JSON formatına dönüştüremedi.")
    except Exception as e:
        print(f"\n--- SINAV ÜRETİM HATASI ---\n{str(e)}\n-------------------\n")
        raise HTTPException(status_code=500, detail=f"Sınav üretilirken hata oluştu: {str(e)}")
    
# -- ÖZET VE HATIRLATMA KARTI OLUŞTURMA BÖLÜMÜ --
    
@app.post("/generate-study-notes")
async def generate_study_notes(file: UploadFile = File(...)):
    try:
        # 1. PDF'i oku (Aynı standart işlem)
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Sadece PDF kabul edilmektedir.")
            
        contents = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(contents))
        extracted_text = "".join([page.extract_text() for page in pdf_reader.pages if page.extract_text()])
        
        # 2. Özet ve Flashcard İçin Özel Prompt
        prompt = f"""
        Sen üniversite seviyesinde uzman bir eğitmensin.
        Aşağıdaki ders notlarını dikkatlice oku. Senden üç şey istiyorum:
        1. Bu notların ders adını/konusunu kısa ve öz belirle (ör: Matematik, Fizik, Tarih - notların dilinde).
        2. Bu notların kapsamlı ama öğrencinin kolayca okuyabileceği (hap bilgi formatında) bir özetini çıkar.
        3. Bu notlardaki EN KRİTİK, sınavlarda çıkma ihtimali en yüksek ve akılda tutulması zor bilgileri kullanarak MAKSİMUM 10 ADET Flashcard (Bilgi Kartı) hazırla. Gereksiz detaylardan kaçın.

        ÇOK ÖNEMLİ DİL KURALI:
        Ders notları hangi dilde yazılmışsa (örneğin İngilizce, Türkçe vb.), özet ve flashcard'lar da KESİNLİKLE metnin orijinal dilinde olmalıdır. Metni başka bir dile çevirme!

        KURALLAR:
        - Yanıtını KESİNLİKLE sadece aşağıdaki JSON formatında ver, başına veya sonuna açıklama ekleme.
        - Flashcard'ların "front" (ön) yüzünde bir kavram veya kısa soru, "back" (arka) yüzünde ise onun net tanımı veya cevabı olmalıdır.
        - KESİNLİKLE 10 adetten fazla flashcard üretme!

        İstenen JSON Formatı:
        {{
          "subject": "Bu notların ders adı/konusu",
          "summary": "Özet metni buraya gelecek. Paragraflar halinde detaylı ama sıkıcı olmayan bir özet...",
          "flashcards": [
            {{
              "front": "Kavram veya Soru",
              "back": "Kavramın tanımı veya sorunun cevabı"
            }}
          ]
        }}

        İşte Ders Notları:
        {extracted_text}
        """

        # 3. Gemini'a gönder
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        
        # 4. JSON Temizliği
        # JSON temizleme işlemini daha sağlam hale getirelim
        content_text = response.text
        if "```json" in content_text:
            clean_text = content_text.split("```json")[1].split("```")[0].strip()
        elif "```" in content_text:
            clean_text = content_text.split("```")[1].split("```")[0].strip()
        else:
            clean_text = content_text.strip()
            
        notes_data = json.loads(clean_text)
        subject = notes_data.pop("subject", "Genel")

        return {
            "status": "success",
            "source_file": file.filename,
            "subject": subject,
            "data": notes_data
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Yapay zeka notları üretti ama istenen JSON formatına dönüştüremedi.")
    except Exception as e:
        print(f"\n--- NOT ÜRETİM HATASI ---\n{str(e)}\n-------------------\n")
        raise HTTPException(status_code=500, detail=f"Çalışma notları üretilirken hata oluştu: {str(e)}")