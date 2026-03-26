"""LlamaIndex service with HuggingFace Transformers"""
from pathlib import Path
import json
from typing import Optional, List, Dict, Any
import re
import random
import numpy as np
import os
import PyPDF2
import pdfplumber
from sentence_transformers import SentenceTransformer
import pickle
from config import INDICES_DIR
from sklearn.metrics.pairwise import cosine_similarity
import requests


class LlamaIndexService:
    """Simple semantic search with HuggingFace"""
    
    def __init__(self):
        """Initialize with HuggingFace"""
        print("📥 Loading embedding model...")
        self.embed_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.indices = {}  # {course_id: {"texts": [...], "embeddings": [...]}}
        self.load_all_indices()
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.ollama_summary_model = os.getenv("OLLAMA_SUMMARY_MODEL", os.getenv("OLLAMA_MODEL", "llama3.2:3b"))
        self.ollama_quiz_model = os.getenv("OLLAMA_QUIZ_MODEL", os.getenv("OLLAMA_MODEL", "mistral:latest"))
        self.ollama_summary_temperature = float(os.getenv("OLLAMA_SUMMARY_TEMPERATURE", "0.1"))
        self.ollama_quiz_temperature = float(os.getenv("OLLAMA_QUIZ_TEMPERATURE", "0.1"))
        self.ollama_num_ctx = int(os.getenv("OLLAMA_NUM_CTX", "8192"))
        self.allow_quiz_llm_fill = os.getenv("QUIZ_LLM_FILL", "1") == "1"
        self.debug_pdf_text = os.getenv("DEBUG_PDF_TEXT", "0") == "1"
        print(f"🤖 Ollama summary model: {self.ollama_summary_model}")
        print(f"🧠 Ollama quiz model: {self.ollama_quiz_model}")
        self._log_ollama_model_status()
        print("✅ Service initialized")
    
    def load_all_indices(self):
        """Load all saved indices from disk"""
        indices_path = Path(INDICES_DIR)
        if indices_path.exists():
            for index_file in indices_path.glob("*.pkl"):
                try:
                    with open(index_file, "rb") as f:
                        data = pickle.load(f)
                        course_id = index_file.stem.replace("index_", "")
                        self.indices[course_id] = data
                        print(f"✅ Loaded index for {course_id}")
                except Exception as e:
                    print(f"⚠️ Error loading {index_file}: {e}")

    def _log_ollama_model_status(self):
        """Log whether configured models are available in local Ollama."""
        try:
            resp = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            resp.raise_for_status()
            payload = resp.json()
            models = payload.get("models", []) if isinstance(payload, dict) else []
            available_names = set()
            for item in models:
                if isinstance(item, dict):
                    name = item.get("name")
                    if isinstance(name, str):
                        available_names.add(name)
                        available_names.add(name.split(":", 1)[0])

            configured = [self.ollama_summary_model, self.ollama_quiz_model]
            for model_name in configured:
                if model_name in available_names or model_name.split(":", 1)[0] in available_names:
                    print(f"✅ Ollama model ready: {model_name}")
                else:
                    print(f"⚠️ Ollama model not found locally: {model_name}")
        except Exception as e:
            print(f"⚠️ Could not verify Ollama models: {e}")

    def _score_extracted_text(self, text: str) -> float:
        """Heuristic score to compare PDF extraction quality."""
        if not text:
            return -1.0
        tokens = re.findall(r"[A-Za-zÇĞİÖŞÜçğıöşü0-9]+", text)
        if len(tokens) < 20:
            return -1.0

        avg_word_len = sum(len(t) for t in tokens) / len(tokens)
        long_word_ratio = sum(1 for t in tokens if len(t) >= 18) / len(tokens)
        letter_count = sum(1 for c in text if c.isalpha())
        punctuation_count = sum(1 for c in text if c in ".,;:!?")
        punctuation_ratio = punctuation_count / max(letter_count, 1)

        return (
            min(len(text) / 1200, 3.0)
            + (1.0 - min(long_word_ratio, 1.0)) * 2.0
            + min(punctuation_ratio * 50, 1.5)
            - max(avg_word_len - 8.0, 0.0) * 0.25
        )

    def _extract_text_with_pdfplumber(self, pdf_path: Path) -> str:
        texts = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""
                if page_text.strip():
                    texts.append(page_text)
        return "\n\n".join(texts)

    def _extract_text_with_pypdf2(self, pdf_path: Path) -> str:
        texts = []
        with open(pdf_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                page_text = page.extract_text() or ""
                if page_text.strip():
                    texts.append(page_text)
        return "\n\n".join(texts)

    def _extract_text_from_pdf(self, pdf_path: Path) -> str:
        """Extract PDF text with dual-engine fallback and pick the cleaner output."""
        plumber_text = ""
        pypdf_text = ""

        try:
            plumber_text = self._extract_text_with_pdfplumber(pdf_path)
        except Exception as e:
            print(f"⚠️ pdfplumber failed for {pdf_path.name}: {e}")

        try:
            pypdf_text = self._extract_text_with_pypdf2(pdf_path)
        except Exception as e:
            print(f"⚠️ PyPDF2 failed for {pdf_path.name}: {e}")

        plumber_score = self._score_extracted_text(plumber_text)
        pypdf_score = self._score_extracted_text(pypdf_text)
        best_text = plumber_text if plumber_score >= pypdf_score else pypdf_text

        if self.debug_pdf_text:
            print(f"[PDF DEBUG] {pdf_path.name} | pdfplumber={plumber_score:.2f}, PyPDF2={pypdf_score:.2f}")
            print("[PDF DEBUG PREVIEW]", best_text[:1200])

        return best_text
    
    def create_index_from_folder(
        self,
        folder_path: str,
        course_id: str,
    ) -> dict:
        """Create index from folder of PDF documents"""
        try:
            folder = Path(folder_path)
            pdfs = list(folder.glob("*.pdf"))
            
            if not pdfs:
                return {"success": False, "error": "No PDFs found", "doc_count": 0}
            
            # Extract text from PDFs
            all_texts = []
            for pdf_path in pdfs:
                try:
                    raw_text = self._extract_text_from_pdf(pdf_path)
                    cleaned = self._clean_text(raw_text)
                    if cleaned.strip():
                        all_texts.append(cleaned)
                except Exception as e:
                    print(f"⚠️ Error reading {pdf_path}: {e}")
                    continue
            
            if not all_texts:
                return {"success": False, "error": "No text extracted from PDFs", "doc_count": 0}
            
            # Split into chunks (512 chars)
            chunks = []
            for text in all_texts:
                sentences = self._split_sentences(text)
                current_chunk = ""
                for line in sentences:
                    if len(current_chunk) + len(line) > 512:
                        if current_chunk:
                            chunks.append(current_chunk)
                        current_chunk = line
                    else:
                        current_chunk = (current_chunk + " " + line).strip()
                if current_chunk:
                    chunks.append(current_chunk)
            
            # Create embeddings
            print(f"🔄 Creating {len(chunks)} embeddings...")
            embeddings = self.embed_model.encode(chunks, show_progress_bar=True)
            
            # Store in memory
            self.indices[course_id] = {
                "texts": chunks,
                "embeddings": embeddings,
                "doc_count": len(pdfs)
            }
            
            # Save to disk
            index_path = Path(INDICES_DIR) / f"index_{course_id}.pkl"
            with open(index_path, "wb") as f:
                pickle.dump(self.indices[course_id], f)
            
            return {
                "success": True,
                "course_id": course_id,
                "doc_count": len(pdfs),
                "chunk_count": len(chunks),
                "indexed_id": f"idx_{course_id}",
            }
        
        except Exception as e:
            print(f"❌ Error: {e}")
            return {"success": False, "error": str(e), "doc_count": 0}
    
    def semantic_search(
        self,
        query: str,
        course_id: str,
        limit: int = 3,
    ) -> List[dict]:
        """Perform semantic search on indexed course"""
        try:
            if course_id not in self.indices:
                return []
            
            index_data = self.indices[course_id]
            texts = index_data["texts"]
            embeddings = index_data["embeddings"]
            
            # Embed query
            query_embedding = self.embed_model.encode(query)

            # Calculate similarity (cosine)
            similarities = cosine_similarity([query_embedding], embeddings)[0]
            top_indices = np.argsort(similarities)[::-1][:limit]
            
            results = []
            for idx in top_indices:
                results.append({
                    "text": texts[idx],
                    "relevance_score": float(similarities[idx]),
                    "source": "PDF",
                })
            
            return results
        
        except Exception as e:
            print(f"Search error: {e}")
            return []
    
    def generate_quiz(
        self,
        course_id: str,
        topic: Optional[str] = None,
        count: int = 10,
    ) -> dict:
        """Generate quiz questions from course context"""
        try:
            # Get semantic search context
            query = topic or "Dersin ana kavramlari, tanimlar, tarihler ve neden-sonuc iliskileri"
            context_docs = self.semantic_search(query, course_id, limit=16)
            
            # Combine context
            context_text = "\n\n".join([doc["text"] for doc in context_docs])
            
            if not context_text:
                return {
                    "success": False,
                    "error": "No context found for quiz generation",
                }
            
            # Use deterministic fact-based quiz first for reliability.
            questions = self._generate_quiz_from_text(context_text, count)

            # Fill missing slots with LLM only when explicitly enabled.
            if len(questions) < count and self.allow_quiz_llm_fill:
                llm_fill = self._generate_quiz_with_ollama(context_text, count - len(questions)) or []
                seen = {q["question"].lower() for q in questions if isinstance(q.get("question"), str)}
                for q in llm_fill:
                    q_text = str(q.get("question", "")).lower()
                    if q_text in seen:
                        continue
                    questions.append(q)
                    seen.add(q_text)
                    if len(questions) >= count:
                        break
            
            return {
                "success": True,
                "questions": questions,
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }

    def _repair_joined_words(self, text: str) -> str:
        """Repair common spacing issues from PDF extraction and model outputs."""
        if not text:
            return ""
        # Join hyphenated line-break words.
        text = re.sub(r"([A-Za-zÇĞİÖŞÜçğıöşü])\-\s*\n\s*([A-Za-zÇĞİÖŞÜçğıöşü])", r"\1\2", text)
        # Ensure punctuation is followed by a space.
        text = re.sub(r"([.,;:!?])([A-Za-zÇĞİÖŞÜçğıöşü])", r"\1 \2", text)
        # Split merged lowerCaseUpperCase tokens, common in broken OCR/PDF text.
        text = re.sub(r"(?<=[a-zçğıöşü])(?=[A-ZÇĞİÖŞÜ])", " ", text)
        # Separate number+word collisions.
        text = re.sub(r"(?<=[A-Za-zÇĞİÖŞÜçğıöşü])(?=\d)", " ", text)
        text = re.sub(r"(?<=\d)(?=[A-Za-zÇĞİÖŞÜçğıöşü])", " ", text)
        return text

    def _fix_mojibake(self, text: str) -> str:
        """Fix common UTF-8/Latin-1 mojibake patterns (e.g. GÃ¼mrÃ¼ -> Gümrü)."""
        if not text:
            return ""

        markers_before = text.count("Ã") + text.count("Ä") + text.count("Å")
        if markers_before < 2:
            return text

        for source_encoding in ("latin1", "cp1252"):
            try:
                repaired = text.encode(source_encoding, errors="ignore").decode("utf-8", errors="ignore")
            except Exception:
                continue

            markers_after = repaired.count("Ã") + repaired.count("Ä") + repaired.count("Å")
            if markers_after < markers_before and len(repaired.strip()) > 0:
                return repaired

        return text
    
    def _clean_text(self, text: str) -> str:
        """Normalize PDF text: remove bullets, page numbers, extra spaces."""
        if not text:
            return ""
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        text = self._fix_mojibake(text)
        text = self._repair_joined_words(text)
        # Remove typical bullet marks and weird glyphs
        bullet_repls = ["•", "\u2022", "▪", "□", "■", "●", "○"]
        for b in bullet_repls:
            text = text.replace(b, ". ")
        # Remove common book heading / author line noise
        text = re.sub(r"Silberschatz,\s*Galvin\s*and\s*Gagne[^.]*", " ", text, flags=re.IGNORECASE)
        text = re.sub(r"Operating System Concepts[^.]*", " ", text, flags=re.IGNORECASE)
        text = re.sub(r"©\s*\d{4}", " ", text)
        # Remove section numbering like 11.45 or 10th
        text = re.sub(r"\b\d{1,3}\.\d{1,3}\b", " ", text)
        text = re.sub(r"\b\d{1,2}(th|st|nd|rd)\b", " ", text, flags=re.IGNORECASE)
        # Remove stray digits-only lines
        text = re.sub(r"\n\s*\d+\s*\n", "\n", text)
        # Normalize punctuation before flattening line breaks
        text = re.sub(r"\s+([.,;:!?])", r"\1", text)
        text = re.sub(r"([.,;:!?])([A-Za-zÇĞİÖŞÜçğıöşü])", r"\1 \2", text)
        # Collapse whitespace
        text = text.replace("\n", " ")
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def _clean_output_text(self, text: str) -> str:
        """Clean model outputs to remove garbled chars and mixed-language artifacts."""
        if not text:
            return ""
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        text = self._fix_mojibake(text)
        text = self._repair_joined_words(text)
        # Remove exotic symbols except Turkish letters, digits, punctuation, and underscore (for blanks)
        text = re.sub(r"[^A-Za-z0-9ÇĞİÖŞÜçğıöşü_'\"\n\s.,;:!?()\-]", " ", text)
        # Remove leftover bullet squares explicitly
        text = text.replace("□", " ")
        # Collapse spaces but keep paragraphs
        text = re.sub(r"[^\S\n]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Normalize spacing around punctuation
        text = re.sub(r"\s+([.,;:!?])", r"\1", text)
        text = re.sub(r"([({\[])\s+", r"\1", text)
        text = re.sub(r"\s+([)}\]])", r"\1", text)
        return text.strip(" \n")

    def _postprocess_summary_text(self, text: str, max_len: int) -> str:
        """Remove meta/instructional sentences and keep concise Turkish summary."""
        if not text:
            return ""
        sentences = re.split(r"(?<=[.!?])\s+", text.replace("\n", " "))
        filtered = []
        ban_patterns = [
            r"^\s*(instruction|talimat|gorev|prompt|response|output)\b",
            r"^\s*(as an ai|i cannot|cannot comply)\b",
            r"^\s*(aşağıdaki metni|asagidaki metni|aşağıdaki metin|asagidaki metin|verilen metni|metnin özeti|metin özeti|özet|ozet)\b",
        ]
        for s in sentences:
            ss = s.strip()
            if len(ss) < 20:
                continue
            low = ss.lower()
            if any(re.search(bp, low) for bp in ban_patterns):
                continue
            # Strip explicit labels, but keep meaningful first words like "Bu durum".
            ss = re.sub(r"^(özet|ozet|ders özeti|ders ozeti)\s*:\s*", "", ss, flags=re.IGNORECASE)
            ss = re.sub(r"^(aşağıdaki|asagidaki)\s+metin\s*,?\s*", "", ss, flags=re.IGNORECASE)
            if not ss:
                continue
            if ss[0].isalpha() and ss[0].islower():
                ss = ss[0].upper() + ss[1:]
            filtered.append(ss)
        if not filtered:
            filtered = [text]
        if filtered and re.search(r"\b(özet|ozet)\b\s*:", filtered[0], flags=re.IGNORECASE):
            filtered = filtered[1:] if len(filtered) > 1 else [re.sub(r"\b(özet|ozet)\b\s*:", "", filtered[0], flags=re.IGNORECASE)]
        # Limit sentences and length
        filtered = filtered[:16]
        joined = " ".join(filtered)
        if len(joined) > max_len:
            joined = joined[:max_len].rsplit(". ", 1)[0]
        # Regroup into paragraphs of 2 sentences for readability
        parts = []
        for i in range(0, len(filtered), 2):
            parts.append(" ".join(filtered[i:i+2]))
        return "\n\n".join(parts) if parts else joined

    def _guess_language(self, text: str) -> str:
        """Very lightweight language hint: if Turkish chars dominate, return 'turkish', else 'english'."""
        tr_chars = "çğıöşüÇĞİÖŞÜ"
        tr_count = sum(1 for ch in text if ch in tr_chars)
        if tr_count > 10 and tr_count > 0.02 * len(text):
            return "turkish"

        normalized = (
            text.lower()
            .replace("ı", "i")
            .replace("ş", "s")
            .replace("ğ", "g")
            .replace("ü", "u")
            .replace("ö", "o")
            .replace("ç", "c")
        )
        tokens = re.findall(r"[a-z]+", normalized)
        if tokens:
            tr_markers = {
                "ve", "ile", "icin", "ancak", "gibi", "daha", "sonra", "once",
                "cumhuriyet", "turkiye", "antlasmasi", "hukumeti", "tbmm", "milli",
            }
            marker_count = sum(1 for t in tokens if t in tr_markers)
            if marker_count >= 6 or marker_count >= max(3, len(tokens) // 25):
                return "turkish"
        # default to english for PDFs in English
        return "english"

    def _split_sentences(self, text: str) -> List[str]:
        """Split text into clean sentences."""
        cleaned = self._clean_text(text)
        parts = re.split(r"(?<=[.!?])\s+", cleaned)
        sentences = []
        for p in parts:
            s = p.strip()
            # Skip very short or mostly numeric fragments
            if len(s) < 20:
                continue
            if sum(c.isalpha() for c in s) < 10:
                continue
            if re.search(r"Silberschatz|Operating System Concepts", s, flags=re.IGNORECASE):
                continue
            sentences.append(s)
        return sentences

    def _extract_keywords(self, sentence: str, max_keywords: int = 6) -> List[str]:
        """Very lightweight keyword picker for quiz options."""
        stopwords = {
            "the", "and", "with", "from", "that", "this", "for", "have", "has",
            "into", "using", "such", "these", "those", "over", "under", "between",
            "their", "there", "which", "while", "where", "when", "also", "than",
            "both", "been", "into", "other", "into", "its", "are", "was", "were",
            "will", "can", "cannot", "should", "would", "could", "may", "might",
            "ve", "ile", "için", "gibi", "olan", "olarak", "bir", "bu", "şu", "o",
            "çok", "daha", "ile", "veya", "da", "de", "ile", "sonra", "önce", "üzere",
            "göre", "ancak", "fakat", "çünkü", "hem", "ya", "ki", "mi", "mı", "mu", "mü",
        }
        words = re.findall(r"[A-Za-zÇĞİÖŞÜçğıöşü0-9][A-Za-zÇĞİÖŞÜçğıöşü0-9\-]{3,}", sentence)
        filtered = [
            w for w in words
            if w.lower() not in stopwords and not re.fullmatch(r"[A-Da-d]", w)
        ]
        # Sort by length to favor more informative words
        filtered.sort(key=lambda w: len(w), reverse=True)
        return filtered[:max_keywords]

    def _is_meaningful_option(self, value: str) -> bool:
        """Validate that a quiz option is meaningful and not placeholder noise."""
        s = self._clean_output_text(value).strip(" .,:;!?\"'")
        if len(s) < 3 or len(s) > 240:
            return False
        if re.fullmatch(r"[A-Da-d]", s):
            return False
        if s.lower().startswith("seçenek") or s.lower().startswith("secenek"):
            return False
        if not re.search(r"[A-Za-zÇĞİÖŞÜçğıöşü]", s):
            return False
        lower_s = s.lower()
        if lower_s.startswith(("ve ", "ile ", "ancak ", "fakat ", "çünkü ", "cunku ", "böylece ", "boylece ", "ayrıca ", "ayrica ", "zaten ")):
            return False
        words = s.split()
        # Avoid single lowercase verb-like outputs (e.g. "sağlanmalıydı", "verilmiştir").
        if len(words) == 1 and words[0][0].islower():
            return False
        if len(words) == 1 and re.search(r"(mak|mek|dı|di|du|dü|tı|ti|tu|tü|yor|miştir|mıştır|muştur|müştür|malı|meli)$", words[0].lower()):
            return False
        common_acronyms = {"TBMM", "SSCB", "ABD", "NATO", "AB"}
        if len(words) == 1 and words[0].isupper() and len(words[0]) > 5 and words[0] not in common_acronyms:
            return False
        return True

    def _is_valid_quiz_item(self, question: str, options: List[str], correct_index: int) -> bool:
        """Guardrail for quiz quality before returning to UI."""
        q = self._clean_output_text(question)
        if len(q) < 25:
            return False
        if len(q.split()) < 5:
            return False
        if re.search(r"aşağıdaki metni|yalnızca json|json dizi", q, flags=re.IGNORECASE):
            return False
        if len(options) != 4:
            return False
        if not isinstance(correct_index, int) or correct_index < 0 or correct_index > 3:
            return False
        normalized = [self._clean_output_text(opt).strip().lower() for opt in options]
        if len(set(normalized)) != 4:
            return False
        if any(not self._is_meaningful_option(opt) for opt in options):
            return False
        return True

    def _contains_answer_leak(self, question: str, answer: str) -> bool:
        """Return True when question text leaks the correct answer explicitly."""
        q = self._clean_output_text(question).lower()
        a = self._clean_output_text(answer).lower().strip()
        if not a:
            return False
        if a in q:
            return True
        # Secondary relaxed check for apostrophe/spacing variants.
        q2 = re.sub(r"[^a-z0-9çğıöşü\s]", " ", q)
        a2 = re.sub(r"[^a-z0-9çğıöşü\s]", " ", a).strip()
        return bool(a2 and a2 in q2)

    def _normalize_question_text(self, question: str) -> str:
        """Normalize question stem phrasing for cleaner UX."""
        q = self._clean_output_text(question)
        q = re.sub(r"^\s*metne\s+gore\s+", "", q, flags=re.IGNORECASE)
        q = re.sub(r"^\s*metne\s+göre\s+", "", q, flags=re.IGNORECASE)
        q = re.sub(r"\s+", " ", q).strip()
        return q

    def _extract_candidate_phrases(self, sentence: str) -> List[tuple]:
        """Extract answer candidates with lightweight type tags."""
        candidates: List[tuple] = []
        months = r"Ocak|Şubat|Subat|Mart|Nisan|Mayıs|Mayis|Haziran|Temmuz|Ağustos|Agustos|Eylül|Eylul|Ekim|Kasım|Kasim|Aralık|Aralik"
        common_locations = {
            "Ankara", "Samsun", "Erzurum", "Sivas", "Kastamonu", "Izmir", "İzmir", "Uşak", "Usak",
            "Manisa", "Kars", "Paris", "Havza", "Akdeniz", "Moskova", "Gümrü", "Gumru",
        }

        for m in re.finditer(rf"\b\d{{1,2}}\s+(?:{months})\s+\d{{4}}\b", sentence):
            candidates.append(("date", m.group(0)))

        for m in re.finditer(r"\b[A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü\-]+(?:\s+[A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü\-]+){0,4}\s+(?:Antlaşması|Anlaşması)\b", sentence):
            candidates.append(("agreement", m.group(0)))

        for m in re.finditer(r"\b(TBMM|Misak-ı\s*Milli|Misak-i\s*Milli|Kuva-yi\s*Milliye|Kuva-yı\s*Milliye|Saltanat|Cumhuriyet|Ankara\s+Hükümeti|Paris\s+Barış\s+Konferansı)\b", sentence, flags=re.IGNORECASE):
            candidates.append(("institution", m.group(0)))

        for m in re.finditer(r"\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s+(Devletleri|Hükümeti|Ordusu|Cemiyeti|Meclisi)\b", sentence):
            candidates.append(("institution", m.group(0)))

        for m in re.finditer(r"\b(TBMM|SSCB|ABD|AB|NATO)\b", sentence):
            candidates.append(("institution", m.group(0)))

        # Person names (2-part names, optional Pasa/Paşa suffix)
        for m in re.finditer(r"\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+Paşa)?\b", sentence):
            candidates.append(("entity", m.group(0)))

        # Frequent location names.
        for loc in common_locations:
            if re.search(rf"\b{re.escape(loc)}\b", sentence, flags=re.IGNORECASE):
                candidates.append(("entity", loc))

        dedup = []
        seen = set()
        country_tokens = {
            "azerbaycan", "ermenistan", "gürcistan", "gurcistan", "türkiye", "turkiye", "fransa",
            "italya", "ingiltere", "rusya", "yunanistan", "suriye", "irak", "iran",
        }
        for ctype, phrase in candidates:
            cleaned = self._clean_output_text(phrase).strip(" .,:;!?\"'")
            first_word = cleaned.split()[0].lower() if cleaned.split() else ""
            if first_word in {"ve", "ile", "ancak", "fakat", "çünkü", "cunku", "böylece", "boylece", "ayrıca", "ayrica", "zaten"}:
                continue
            if ctype == "entity" and re.search(r"antlaşma|anlaşma", cleaned, flags=re.IGNORECASE):
                continue
            if ctype == "entity" and re.search(r"devletleri|hükümeti|ordusu|cemiyeti|meclisi", cleaned, flags=re.IGNORECASE):
                continue
            if ctype == "entity" and re.search(r"savaşı|savasi|taarruz|harekat|harekât|zaferi", cleaned, flags=re.IGNORECASE):
                continue
            if ctype == "entity":
                words = [w.lower() for w in cleaned.split()]
                if len(words) >= 2 and all(w in country_tokens for w in words):
                    continue
            key = (ctype, cleaned.lower())
            if key in seen or not self._is_meaningful_option(cleaned):
                continue
            seen.add(key)
            dedup.append((ctype, cleaned))
        return dedup

    def _pick_best_answer(self, candidates: List[tuple]) -> Optional[tuple]:
        """Pick the strongest answer span from sentence-level candidates."""
        if not candidates:
            return None
        priority = {
            "agreement": 0,
            "date": 1,
            "institution": 2,
            "entity": 3,
        }
        sorted_candidates = sorted(candidates, key=lambda c: (priority.get(c[0], 9), -len(c[1])))
        return sorted_candidates[0]

    def _pick_distractors(self, answer: str, answer_type: str, pools_by_type: dict) -> List[str]:
        """Pick plausible distractors from same type first, then global pool."""
        answer_low = answer.lower()
        same_type = [
            p for p in pools_by_type.get(answer_type, [])
            if p.lower() != answer_low and self._is_meaningful_option(p)
        ]
        global_pool = []
        for _, values in pools_by_type.items():
            global_pool.extend(values)
        global_pool = [
            p for p in global_pool
            if p.lower() != answer_low and self._is_meaningful_option(p)
        ]

        random.shuffle(same_type)
        random.shuffle(global_pool)
        merged = []
        for item in same_type + global_pool:
            if item.lower() in {x.lower() for x in merged}:
                continue
            merged.append(item)
            if len(merged) >= 3:
                break
        return merged

    def _replace_answer_in_sentence(self, sentence: str, answer: str, replacement: str) -> Optional[str]:
        """Replace answer span once in sentence while preserving readability."""
        word_pattern = re.compile(rf"\b{re.escape(answer)}\b", re.IGNORECASE)
        replaced, n = word_pattern.subn(replacement, sentence)
        if n == 0:
            raw_pattern = re.compile(re.escape(answer), re.IGNORECASE)
            replaced, n = raw_pattern.subn(replacement, sentence)
        if n == 0:
            return None
        return self._clean_output_text(replaced)

    def _concept_question_text(self, answer_type: str) -> str:
        mapping = {
            "agreement": "Metinde adı geçen anlaşma hangisidir?",
            "date": "Metinde geçen tarih hangisidir?",
            "institution": "Metinde adı geçen kurum veya kavram hangisidir?",
            "entity": "Metinde adı geçen kişi veya yer hangisidir?",
        }
        return mapping.get(answer_type, "Metne göre doğru kavram hangisidir?")

    def _concept_label_text(self, answer_type: str) -> str:
        labels = {
            "agreement": "anlaşma",
            "date": "tarih",
            "institution": "kurum veya kavram",
            "entity": "kişi veya yer",
        }
        return labels.get(answer_type, "kavram")

    def _generate_quiz_from_text(self, text: str, count: int) -> List[dict]:
        """Generate mixed-type, fact-based multiple-choice questions from context text."""
        sentences = self._split_sentences(text)
        if not sentences:
            return []

        # Build per-type candidate pools for distractor quality.
        pools_by_type = {
            "agreement": [],
            "date": [],
            "institution": [],
            "entity": [],
        }
        sentence_candidates = []
        for sent in sentences:
            cands = self._extract_candidate_phrases(sent)
            if not cands:
                continue
            sentence_candidates.append((sent, cands))
            for ctype, phrase in cands:
                pools_by_type.setdefault(ctype, []).append(phrase)

        if not sentence_candidates:
            return []

        # Shuffle to diversify, but keep determinism via seed.
        random.seed(42)
        random.shuffle(sentence_candidates)

        facts = []
        for sent, cands in sentence_candidates:
            picked = self._pick_best_answer(cands)
            if not picked:
                continue
            answer_type, answer = picked
            distractors = self._pick_distractors(answer, answer_type, pools_by_type)
            if len(distractors) < 3:
                continue
            same_type = [
                p for p in pools_by_type.get(answer_type, [])
                if p.lower() != answer.lower() and self._is_meaningful_option(p)
            ]
            same_type_unique = []
            for item in same_type:
                if item.lower() in {x.lower() for x in same_type_unique}:
                    continue
                same_type_unique.append(item)
                if len(same_type_unique) >= 3:
                    break
            cleaned_sentence = self._clean_output_text(sent)
            if len(cleaned_sentence) < 40:
                continue
            if len(cleaned_sentence.split()) < 8:
                continue
            if re.search(r"\b\d{1,3}\.?$", cleaned_sentence):
                continue
            if cleaned_sentence.endswith((",", ";", ":")):
                continue
            facts.append({
                "sentence": cleaned_sentence,
                "answer_type": answer_type,
                "answer": answer,
                "distractors": distractors,
                "same_type_distractors": same_type_unique,
            })

        if not facts:
            return []

        random.shuffle(facts)

        questions: List[dict] = []
        seen_questions = set()
        source_usage: Dict[str, int] = {}
        answer_type_usage = {
            "agreement": 0,
            "date": 0,
            "institution": 0,
            "entity": 0,
        }

        def add_question(
            question_text: str,
            options: List[str],
            correct_index: int,
            answer_type: Optional[str] = None,
            answer_text: Optional[str] = None,
            source_key: Optional[str] = None,
        ):
            if len(questions) >= count:
                return
            if answer_type == "entity" and answer_type_usage.get("entity", 0) >= 2:
                return
            if source_key:
                src = self._clean_output_text(source_key).lower()
                if source_usage.get(src, 0) >= 1:
                    return
            cleaned_q = self._normalize_question_text(question_text)[:280]
            cleaned_options = [self._clean_output_text(o)[:180] for o in options]
            if "boş bırakılan yere" in cleaned_q.lower() and "_____" not in cleaned_q:
                return
            if "_____" in cleaned_q:
                lower_q = cleaned_q.lower()
                allowed_masked_forms = [
                    "boş bırakılan yere",
                    "ifadede geçen",
                    "cümlede geçen",
                ]
                if not any(marker in lower_q for marker in allowed_masked_forms):
                    return
            if answer_text and self._contains_answer_leak(cleaned_q, answer_text):
                return
            if not self._is_valid_quiz_item(cleaned_q, cleaned_options, correct_index):
                return
            q_key = cleaned_q.lower()
            if q_key in seen_questions:
                return
            seen_questions.add(q_key)
            questions.append({
                "question": cleaned_q,
                "options": cleaned_options,
                "correct": correct_index,
            })
            if source_key:
                src = self._clean_output_text(source_key).lower()
                source_usage[src] = source_usage.get(src, 0) + 1
            if answer_type in answer_type_usage:
                answer_type_usage[answer_type] += 1

        cloze_target = max(1, count // 6)
        concept_target = max(3, count // 2)
        statement_target = max(1, count - cloze_target - concept_target)

        # Type 2: Context-specific concept/entity selection
        for fact in facts:
            if len(questions) >= cloze_target + concept_target:
                break
            snippet = self._replace_answer_in_sentence(fact["sentence"], fact["answer"], "_____")
            if not snippet:
                continue
            label = self._concept_label_text(fact["answer_type"])
            q_text = f"Aşağıdaki ifadede boş bırakılan yere hangi {label} gelmelidir? {snippet[:180]}"
            concept_distractors = fact["same_type_distractors"][:3] if len(fact["same_type_distractors"]) >= 3 else fact["distractors"][:3]
            if len(concept_distractors) < 3:
                continue
            options = [fact["answer"]] + concept_distractors
            random.shuffle(options)
            add_question(q_text, options, options.index(fact["answer"]), fact["answer_type"], fact["answer"], fact["sentence"])

        # Type 3: Statement truth question (full-sentence options)
        for fact in facts:
            if len(questions) >= count:
                break
            if statement_target <= 0:
                break
            fake_options = []
            for dist in fact["distractors"]:
                fake_sentence = self._replace_answer_in_sentence(fact["sentence"], fact["answer"], dist)
                if not fake_sentence:
                    continue
                if fake_sentence.lower() == fact["sentence"].lower():
                    continue
                fake_options.append(fake_sentence)
            # Ensure 3 distinct fake statements.
            uniq_fake = []
            for f in fake_options:
                if f.lower() in {x.lower() for x in uniq_fake}:
                    continue
                uniq_fake.append(f)
                if len(uniq_fake) >= 3:
                    break
            if len(uniq_fake) < 3:
                continue
            q_text = "Aşağıdaki ifadelerden hangisi doğrudur?"
            options = [fact["sentence"]] + uniq_fake
            random.shuffle(options)
            add_question(q_text, options, options.index(fact["sentence"]), fact["answer_type"], None, fact["sentence"])
            statement_target -= 1

        # Final deterministic fill (prefer concept/statement, cloze only as last resort).
        for fact in facts:
            if len(questions) >= count:
                break
            snippet = self._replace_answer_in_sentence(fact["sentence"], fact["answer"], "_____")
            if not snippet:
                continue
            snippet = snippet[:180]
            label = self._concept_label_text(fact["answer_type"])
            q_text = f"Şu ifadede geçen {label} hangisidir? {snippet}"
            concept_distractors = fact["same_type_distractors"][:3] if len(fact["same_type_distractors"]) >= 3 else fact["distractors"][:3]
            if len(concept_distractors) < 3:
                continue
            options = [fact["answer"]] + concept_distractors
            random.shuffle(options)
            add_question(q_text, options, options.index(fact["answer"]), fact["answer_type"], fact["answer"], fact["sentence"])

        for fact in facts:
            if len(questions) >= count:
                break
            fake_options = []
            for dist in fact["distractors"]:
                fake_sentence = self._replace_answer_in_sentence(fact["sentence"], fact["answer"], dist)
                if not fake_sentence:
                    continue
                if fake_sentence.lower() == fact["sentence"].lower():
                    continue
                fake_options.append(fake_sentence)
            uniq_fake = []
            for f in fake_options:
                if f.lower() in {x.lower() for x in uniq_fake}:
                    continue
                uniq_fake.append(f)
                if len(uniq_fake) >= 3:
                    break
            if len(uniq_fake) < 3:
                continue
            q_text = "Aşağıdaki ifadelerden hangisi doğrudur?"
            options = [fact["sentence"]] + uniq_fake
            random.shuffle(options)
            add_question(q_text, options, options.index(fact["sentence"]), fact["answer_type"], None, fact["sentence"])

        for fact in facts:
            if len(questions) >= count:
                break
            # Cloze is now true fallback; keep it limited.
            current_cloze = sum(1 for q in questions if "boş bırakılan yere" in q["question"].lower())
            if current_cloze >= max(2, cloze_target + 1):
                break
            replaced = self._replace_answer_in_sentence(fact["sentence"], fact["answer"], "_____")
            if not replaced:
                continue
            q_text = f"Aşağıdaki cümlede boş bırakılan yere hangi ifade gelmelidir? {replaced}"
            options = [fact["answer"]] + fact["distractors"][:3]
            random.shuffle(options)
            add_question(q_text, options, options.index(fact["answer"]), fact["answer_type"], fact["answer"], fact["sentence"])

        # If still short, fill from LLM path later in caller.

        return questions[:count]
    
    def get_summary(
        self,
        course_id: str,
        max_length: int = 500,
    ) -> dict:
        """Get summary of indexed course"""
        try:
            context_docs = self.semantic_search(
                "Özet ve ana konular",
                course_id,
                limit=8,
            )

            if not context_docs:
                return {
                    "success": False,
                    "error": "No content found",
                }

            context_text = "\n\n".join([doc["text"] for doc in context_docs])
            summary = self._generate_summary_with_ollama(context_text, max_length)
            if not summary:
                summary = self._build_extractive_summary(context_text, max_length)

            return {
                "success": True,
                "summary": summary,
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }

    def _build_extractive_summary(self, text: str, max_length: int) -> str:
        """Simple extractive summary using centroid similarity over sentences."""
        sentences = self._split_sentences(text)
        if not sentences:
            return text[:max_length]

        # Deduplicate similar/identical sentences
        seen = set()
        uniq_sentences = []
        for s in sentences:
            key = s.lower()
            if key in seen:
                continue
            seen.add(key)
            uniq_sentences.append(s)

        # Encode sentences and score by similarity to centroid
        embeddings = self.embed_model.encode(uniq_sentences)
        centroid = embeddings.mean(axis=0)
        scores = cosine_similarity([centroid], embeddings)[0]
        ranked = [s for _, s in sorted(zip(scores, uniq_sentences), key=lambda x: x[0], reverse=True)]

        picked = []
        total_len = 0
        for s in ranked:
            if total_len + len(s) > max_length and len(picked) >= 3:
                break
            picked.append(s)
            total_len += len(s)
            if total_len >= max_length * 0.9 and len(picked) >= 3:
                break

        # Ensure at least 3 sentences
        if len(picked) < 3 and len(ranked) >= 3:
            picked = ranked[:3]

        # Group into short paragraphs (2-3 sentences each)
        paragraphs = []
        for i in range(0, len(picked), 2):
            paragraphs.append(" ".join(picked[i:i+2]))

        return "\n\n".join(paragraphs)

    # -----------------
    # Ollama helpers
    # -----------------

    def _ollama_generate_legacy(self, model: str, prompt: str, timeout: int = 60, system: Optional[str] = None, options: Optional[dict] = None) -> Optional[str]:
        try:
            resp = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    **({"system": system} if system else {}),
                    **({"options": options} if options else {}),
                    "stream": False,
                },
                timeout=timeout,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("response") or data.get("content") or ""
        except Exception as e:
            print(f"Ollama generate error: {e}")
            return None

    def _ollama_chat(
        self,
        model: str,
        system_prompt: str,
        user_prompt: str,
        timeout: int = 60,
        options: Optional[dict] = None,
        response_format: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """Use Ollama chat API with explicit system/user roles."""
        payload: Dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "stream": False,
        }
        if options:
            payload["options"] = options
        if response_format:
            payload["format"] = response_format

        try:
            resp = requests.post(
                f"{self.ollama_url}/api/chat",
                json=payload,
                timeout=timeout,
            )
            resp.raise_for_status()
            data = resp.json()
            message = data.get("message") if isinstance(data, dict) else None
            if isinstance(message, dict):
                content = message.get("content")
                if isinstance(content, str):
                    return content
            return data.get("response") or data.get("content") or ""
        except Exception as e:
            print(f"Ollama chat error (fallback to legacy generate): {e}")
            return self._ollama_generate_legacy(
                model,
                user_prompt,
                timeout=timeout,
                system=system_prompt,
                options=options,
            )

    def _generate_summary_with_ollama(self, context_text: str, max_length: int) -> Optional[str]:
        try:
            context = context_text[:10000]
            if os.getenv("DEBUG_SUMMARY_INPUT", "0") == "1":
                print("[summary ctx]", context[:1200])
            lang = self._guess_language(context)
            target_lang = "English" if lang == "english" else "Turkish"
            system_prompt = (
                "Sen profesyonel bir ozet ve test hazirlayicisisin. "
                "Sadece verilen metne sadik kal. Uydurma bilgi ekleme. "
                "Yanit dilini metnin diliyle birebir ayni tut. "
                "Sadece duz yazi paragraflari don, maddeleme yapma. "
                "Ozete dogrudan konu ile basla; 'Asagidaki metin' veya 'Ozet:' gibi giris cumlesi yazma."
            )
            user_prompt = (
                f"Verilen içerikten {target_lang} dilinde 3-5 paragraf, akici bir ozet yaz. "
                "İlk paragraf genel çerçeve olsun, sonraki paragraflar metindeki temel kavramlar ve önemli neden-sonuç ilişkilerine odaklansın. "
                "Metin dışına çıkma, yalnızca verilen içeriği kullan.\n\n"
                f"METİN:\n{context}"
            )
            resp = self._ollama_chat(
                self.ollama_summary_model,
                system_prompt,
                user_prompt,
                timeout=120,
                options={"temperature": self.ollama_summary_temperature, "num_ctx": self.ollama_num_ctx, "top_p": 0.9},
            )
            if resp:
                summary = self._clean_output_text(resp)
                summary = self._postprocess_summary_text(summary, max_length * 3)
                # Trim to max_length softly
                if len(summary) > max_length * 3:
                    summary = summary[: max_length * 3].rsplit(". ", 1)[0]
                return summary
            return None
        except Exception as e:
            print(f"Summary via Ollama failed: {e}")
            return None

    def _generate_quiz_with_ollama(self, context_text: str, count: int) -> Optional[List[dict]]:
        try:
            context = context_text[:10000]
            system_prompt = (
                "Sen profesyonel bir ogretmensin. Sadece verilen metne dayanarak quiz olustur. "
                "Uydurma bilgi ekleme ve sorulari metinden kanitlanabilir sekilde yaz. "
                "Yanitta sadece gecerli JSON ver. Tek harfli siklar (A,B,C,D) veya anlamsiz ifadeler kullanma."
            )
            user_prompt = (
                f"Aşağıdaki metinden {count} adet çoktan seçmeli soru üret. "
                "Her soruda 4 seçenek olsun. Doğru seçenek indeksi 0-3 arasında verilsin. "
                "Sorular net ve dil bilgisi düzgün olsun. Her seçenek anlamlı bir ifade, olay, tarih, kişi veya kurum adı olsun.\n\n"
                "Dönüş formatı (yalnızca JSON dizi): "
                "[{\"question\":\"...\",\"options\":[\"...\",\"...\",\"...\",\"...\"],\"correctIndex\":0}]\n\n"
                f"METİN:\n{context}"
            )
            response_schema: Dict[str, Any] = {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "question": {"type": "string", "minLength": 25},
                        "options": {
                            "type": "array",
                            "items": {"type": "string", "minLength": 3},
                            "minItems": 4,
                            "maxItems": 4,
                            "uniqueItems": True,
                        },
                        "correctIndex": {"type": "integer", "minimum": 0, "maximum": 3},
                    },
                    "required": ["question", "options", "correctIndex"],
                },
            }
            resp = self._ollama_chat(
                self.ollama_quiz_model,
                system_prompt,
                user_prompt,
                timeout=180,
                options={"temperature": min(self.ollama_quiz_temperature, 0.08), "num_ctx": self.ollama_num_ctx, "top_p": 0.9},
                response_format=response_schema,
            )
            if not resp:
                return None
            parsed = self._extract_json_array(resp)
            if not isinstance(parsed, list):
                return None
            cleaned = []
            for item in parsed[:count]:
                if not isinstance(item, dict):
                    continue
                q = item.get("question")
                opts = item.get("options")
                idx = item.get("correctIndex")
                if not q or not isinstance(opts, list) or len(opts) < 4:
                    continue
                if not isinstance(idx, int) or idx < 0 or idx > 3:
                    idx = 0
                normalized_opts = [self._clean_output_text(str(o)) for o in opts[:4]]
                cleaned_q = self._normalize_question_text(str(q))[:280]
                if not self._is_valid_quiz_item(cleaned_q, normalized_opts, idx):
                    continue
                if self._contains_answer_leak(cleaned_q, normalized_opts[idx]):
                    continue
                cleaned.append({
                    "question": cleaned_q,
                    "options": normalized_opts,
                    "correct": idx,
                })

            return cleaned if cleaned else None
        except Exception as e:
            print(f"Quiz via Ollama failed: {e}")
            return None

    def _extract_json_array(self, text: str):
        """Extract first JSON array from text (handles ```json blocks)."""
        try:
            cleaned = text.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```json|^```", "", cleaned, flags=re.IGNORECASE).strip()
                cleaned = cleaned.rstrip("`").strip()
            # If model returned an object wrapper, unwrap common keys.
            if cleaned.startswith("{"):
                obj = json.loads(cleaned)
                if isinstance(obj, dict):
                    for key in ("questions", "items", "data"):
                        if isinstance(obj.get(key), list):
                            return obj.get(key)
            # Find first [ ... ]
            match = re.search(r"\[.*\]", cleaned, flags=re.DOTALL)
            if match:
                cleaned = match.group(0)
            return json.loads(cleaned)
        except Exception:
            return None


# Global instance
llama_service = LlamaIndexService()
