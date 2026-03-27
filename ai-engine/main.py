from fastapi import FastAPI, HTTPException, UploadFile, File, Form
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
#            model='gemini-2.5-flash',
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

        İstenen JSON Formatı:
        [
          {{
            "question": "Soru metni buraya",
            "options": ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı"],
            "answer": "Doğru olan şıkkın tam metni"
          }}
        ]

        İşte Ders Notları:
        {extracted_text}
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        quiz_data = json.loads(clean_text)

        return {
            "status": "success",
            "source_file": file.filename,
            "requested_count": question_count,
            "actual_count": len(quiz_data), # Gerçekte kaç soru ürettiğini de dönüyoruz
            "quiz": quiz_data
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Yapay zeka soruları üretti ama istenen JSON formatına dönüştüremedi.")
    except Exception as e:
        print(f"\n--- SINAV ÜRETİM HATASI ---\n{str(e)}\n-------------------\n")
        raise HTTPException(status_code=500, detail=f"Sınav üretilirken hata oluştu: {str(e)}")
    
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
        Aşağıdaki ders notlarını dikkatlice oku. Senden iki şey istiyorum:
        1. Bu notların kapsamlı ama öğrencinin kolayca okuyabileceği (hap bilgi formatında) bir özetini çıkar.
        2. Bu notlardaki EN KRİTİK, sınavlarda çıkma ihtimali en yüksek ve akılda tutulması zor bilgileri kullanarak 10-15 adet Flashcard (Bilgi Kartı) hazırla.

        ÇOK ÖNEMLİ DİL KURALI: 
        Ders notları hangi dilde yazılmışsa (örneğin İngilizce, Türkçe vb.), özet ve flashcard'lar da KESİNLİKLE metnin orijinal dilinde olmalıdır. Metni başka bir dile çevirme!

        KURALLAR:
        - Yanıtını KESİNLİKLE sadece aşağıdaki JSON formatında ver, başına veya sonuna açıklama ekleme.
        - Flashcard'ların "front" (ön) yüzünde bir kavram veya kısa soru, "back" (arka) yüzünde ise onun net tanımı veya cevabı olmalıdır.

        İstenen JSON Formatı:
        {{
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
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        notes_data = json.loads(clean_text)

        return {
            "status": "success",
            "source_file": file.filename,
            "data": notes_data
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Yapay zeka notları üretti ama istenen JSON formatına dönüştüremedi.")
    except Exception as e:
        print(f"\n--- NOT ÜRETİM HATASI ---\n{str(e)}\n-------------------\n")
        raise HTTPException(status_code=500, detail=f"Çalışma notları üretilirken hata oluştu: {str(e)}")