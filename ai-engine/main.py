from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from google import genai
import os
from dotenv import load_dotenv
import PyPDF2
import io
import json
import re

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY bulunamadı! Lütfen .env dosyasını kontrol edin.")

client = genai.Client(api_key=api_key)

app = FastAPI(title="ClassY AI Engine")

class PromptRequest(BaseModel):
    text: str


def _extract_first_json_block(text: str) -> str | None:
    in_string = False
    escape = False
    depth = 0
    start = -1

    for i, ch in enumerate(text):
        if escape:
            escape = False
            continue

        if ch == "\\":
            escape = True
            continue

        if ch == '"':
            in_string = not in_string
            continue

        if in_string:
            continue

        if ch in "[{":
            if depth == 0:
                start = i
            depth += 1
            continue

        if ch in "]}":
            if depth > 0:
                depth -= 1
                if depth == 0 and start != -1:
                    return text[start : i + 1]

    return None


def _parse_model_json(text: str):
    if not text:
        raise ValueError("Model bos cevap dondurdu.")

    cleaned = text.replace("\ufeff", "").strip()
    candidates: list[str] = [cleaned]

    fenced_blocks = re.findall(r"```(?:json)?\s*([\s\S]*?)```", cleaned, flags=re.IGNORECASE)
    candidates.extend(block.strip() for block in fenced_blocks if block.strip())

    extracted = _extract_first_json_block(cleaned)
    if extracted:
        candidates.append(extracted.strip())

    # Sırayı koruyarak duplicate elemanları çıkar
    unique_candidates = list(dict.fromkeys(candidates))

    for candidate in unique_candidates:
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue

    raise ValueError("Model cikti metni gecerli JSON'a donusturulemedi.")


def _strip_code_fences(text: str) -> str:
    if not text:
        return ""

    cleaned = re.sub(r"```(?:json)?", "", text, flags=re.IGNORECASE)
    cleaned = cleaned.replace("```", "")
    return cleaned.strip()

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

        parsed = _parse_model_json(response.text or "")

        if isinstance(parsed, list):
            quiz_data = parsed
        elif isinstance(parsed, dict) and isinstance(parsed.get("quiz"), list):
            quiz_data = parsed["quiz"]
        else:
            raise ValueError("Quiz formati beklenen yapiya uymuyor.")

        return {
            "status": "success",
            "source_file": file.filename,
            "requested_count": question_count,
            "actual_count": len(quiz_data), # Gerçekte kaç soru ürettiğini de dönüyoruz
            "quiz": quiz_data
        }

    except (json.JSONDecodeError, ValueError, TypeError):
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
        Aşağıdaki ders notlarını dikkatlice oku. Senden iki şey istiyorum:
        1. Bu notların kapsamlı ama öğrencinin kolayca okuyabileceği (hap bilgi formatında) bir özetini çıkar.
        2. Bu notlardaki EN KRİTİK, sınavlarda çıkma ihtimali en yüksek ve akılda tutulması zor bilgileri kullanarak MAKSİMUM 10 ADET Flashcard (Bilgi Kartı) hazırla. Gereksiz detaylardan kaçın.

        ÇOK ÖNEMLİ DİL KURALI: 
        Ders notları hangi dilde yazılmışsa (örneğin İngilizce, Türkçe vb.), özet ve flashcard'lar da KESİNLİKLE metnin orijinal dilinde olmalıdır. Metni başka bir dile çevirme!

        KURALLAR:
        - Yanıtını KESİNLİKLE sadece aşağıdaki JSON formatında ver, başına veya sonuna açıklama ekleme.
        - Flashcard'ların "front" (ön) yüzünde bir kavram veya kısa soru, "back" (arka) yüzünde ise onun net tanımı veya cevabı olmalıdır.
        - KESİNLİKLE 10 adetten fazla flashcard üretme!

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

        response_text = response.text or ""

        try:
            parsed = _parse_model_json(response_text)

            if isinstance(parsed, dict) and isinstance(parsed.get("data"), dict):
                notes_data = parsed["data"]
            elif isinstance(parsed, dict):
                notes_data = parsed
            else:
                raise ValueError("Not/flashcard formati beklenen yapiya uymuyor.")
        except (json.JSONDecodeError, ValueError, TypeError):
            # JSON bozuk gelse bile kullanıcıya okunur özet döndür.
            fallback_summary = _strip_code_fences(response_text)
            if not fallback_summary:
                raise

            notes_data = {
                "summary": fallback_summary,
                "flashcards": []
            }

        return {
            "status": "success",
            "source_file": file.filename,
            "data": notes_data
        }

    except (json.JSONDecodeError, ValueError, TypeError):
        raise HTTPException(status_code=500, detail="Yapay zeka notları üretti ama istenen JSON formatına dönüştüremedi.")
    except Exception as e:
        print(f"\n--- NOT ÜRETİM HATASI ---\n{str(e)}\n-------------------\n")
        raise HTTPException(status_code=500, detail=f"Çalışma notları üretilirken hata oluştu: {str(e)}")