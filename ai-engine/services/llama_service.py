"""LlamaIndex service with HuggingFace Transformers"""
from pathlib import Path
import json
from typing import Optional, List
import re
import random
import numpy as np
import os
import PyPDF2
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
        self.ollama_quiz_model = os.getenv("OLLAMA_QUIZ_MODEL", os.getenv("OLLAMA_MODEL", "llama3.2:3b"))
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
                    with open(pdf_path, "rb") as f:
                        reader = PyPDF2.PdfReader(f)
                        for page in reader.pages:
                            text = page.extract_text()
                            cleaned = self._clean_text(text)
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
            query = topic or "Özet ve ana konular"
            context_docs = self.semantic_search(query, course_id, limit=5)
            
            # Combine context
            context_text = "\n\n".join([doc["text"] for doc in context_docs])
            
            if not context_text:
                return {
                    "success": False,
                    "error": "No context found for quiz generation",
                }
            
            # Try Ollama first
            questions = self._generate_quiz_with_ollama(context_text, count)
            if not questions:
                # Fallback: template-based quiz generation
                questions = self._generate_quiz_from_text(context_text, count)
            
            return {
                "success": True,
                "questions": questions,
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }
    
    def _clean_text(self, text: str) -> str:
        """Normalize PDF text: remove bullets, page numbers, extra spaces."""
        if not text:
            return ""
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
        # Collapse whitespace
        text = text.replace("\n", " ")
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def _clean_output_text(self, text: str) -> str:
        """Clean model outputs to remove garbled chars and mixed-language artifacts."""
        if not text:
            return ""
        # Remove exotic symbols except Turkish letters, digits, punctuation, and underscore (for blanks)
        text = re.sub(r"[^A-Za-z0-9ÇĞİÖŞÜçğıöşü_\s.,;:!?()\-]", " ", text)
        # Remove leftover bullet squares explicitly
        text = text.replace("□", " ")
        # Collapse spaces
        text = re.sub(r"\s+", " ", text)
        # Normalize spacing around punctuation
        text = re.sub(r"\s+([.,;:!?])", r"\1", text)
        text = re.sub(r"([({\[])\s+", r"\1", text)
        text = re.sub(r"\s+([)}\]])", r"\1", text)
        return text.strip()

    def _postprocess_summary_text(self, text: str, max_len: int) -> str:
        """Remove meta/instructional sentences and keep concise Turkish summary."""
        if not text:
            return ""
        sentences = re.split(r"(?<=[.!?])\s+", text)
        filtered = []
        ban_words = ["özet", "paragraf", "cümle", "yaz", "düşün", "output", "response", "paragraph"]
        for s in sentences:
            ss = s.strip()
            if len(ss) < 20:
                continue
            low = ss.lower()
            if any(bw in low for bw in ban_words):
                continue
            # Drop leading filler like "Bu," or "This"
            ss = re.sub(r"^(bu|this|that|the text)\s*,?\s*", "", ss, flags=re.IGNORECASE)
            filtered.append(ss)
        if not filtered:
            filtered = [text]
        # Limit sentences and length
        filtered = filtered[:15]
        joined = " ".join(filtered)
        if len(joined) > max_len:
            joined = joined[:max_len].rsplit(". ", 1)[0]
        # Regroup into paragraphs of 3 sentences
        parts = []
        for i in range(0, len(filtered), 3):
            parts.append(" ".join(filtered[i:i+3]))
        return "\n\n".join(parts) if parts else joined

    def _guess_language(self, text: str) -> str:
        """Very lightweight language hint: if Turkish chars dominate, return 'turkish', else 'english'."""
        tr_chars = "çğıöşüÇĞİÖŞÜ"
        tr_count = sum(1 for ch in text if ch in tr_chars)
        ascii_letters = sum(1 for ch in text if 'a' <= ch.lower() <= 'z')
        if tr_count > 10 and tr_count > 0.02 * len(text):
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
            if len(s) < 40:
                continue
            if sum(c.isalpha() for c in s) < 20:
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
        }
        words = re.findall(r"[A-Za-zÇĞİÖŞÜçğıöşü0-9][A-Za-zÇĞİÖŞÜçğıöşü0-9\-]{3,}", sentence)
        filtered = [w for w in words if w.lower() not in stopwords]
        # Sort by length to favor more informative words
        filtered.sort(key=lambda w: len(w), reverse=True)
        return filtered[:max_keywords]

    def _generate_quiz_from_text(self, text: str, count: int) -> List[dict]:
        """Generate template-based multiple choice questions from context text."""
        sentences = self._split_sentences(text)
        if not sentences:
            return []

        # Shuffle to diversify, but keep determinism via seed for reproducibility
        random.seed(42)
        random.shuffle(sentences)

        all_keywords = []
        for s in sentences:
            all_keywords.extend(self._extract_keywords(s))

        questions: List[dict] = []
        for idx, sent in enumerate(sentences):
            if len(questions) >= count:
                break

            keywords = self._extract_keywords(sent)
            if not keywords:
                continue

            answer = keywords[0]

            # Alternate: even -> cloze, odd -> kavram sorusu
            is_cloze = (idx % 2 == 0)
            if is_cloze:
                placeholder = "_____"
                pattern = re.compile(re.escape(answer), re.IGNORECASE)
                question_body = pattern.sub(placeholder, sent, count=1)
                question_text = f"Aşağıdaki cümlede boşluğu doldurun: {question_body}"
            else:
                question_text = (
                    "Bu cümlede vurgulanan anahtar kavram hangisidir? "
                    f"{sent}"
                )

            # Build distractors from other keywords
            distractors = [k for k in all_keywords if k.lower() != answer.lower()]
            distractors = list(dict.fromkeys(distractors))  # unique
            random.shuffle(distractors)
            distractors = distractors[:6]

            fallback_pool = [
                "performans", "latency", "throughput", "RAID", "NVM", "SSD", "HDD",
                "zamanlama", "cache", "parity", "consistency", "I/O", "bandwidth",
            ]
            distractors.extend([w for w in fallback_pool if w.lower() != answer.lower()])
            distractors = list(dict.fromkeys(distractors))
            distractors = distractors[:3]

            while len(distractors) < 3:
                distractors.append(f"Seçenek {len(distractors) + 2}")

            options = [answer] + distractors
            random.shuffle(options)
            correct_index = options.index(answer)

            questions.append({
                "question": self._clean_output_text(question_text)[:240],
                "options": [self._clean_output_text(o) for o in options],
                "correct": correct_index,
            })

        # Fallback generic questions if we did not reach desired count
        # Use remaining sentences to create cloze questions; avoid placeholder "Doğru cevap" tipi
        fallback_idx = 0
        while len(questions) < count and fallback_idx < len(sentences):
            sent = sentences[fallback_idx]
            fallback_idx += 1
            kws = self._extract_keywords(sent)
            if not kws:
                continue
            ans = kws[0]
            placeholder = "_____"
            question_body = re.sub(re.escape(ans), placeholder, sent, flags=re.IGNORECASE, count=1)
            distractors = [k for k in all_keywords if k.lower() != ans.lower()]
            random.shuffle(distractors)
            distractors = distractors[:3] if len(distractors) >= 3 else distractors
            while len(distractors) < 3:
                distractors.append(fallback_pool[len(distractors) % len(fallback_pool)])
            options = [ans] + distractors[:3]
            random.shuffle(options)
            questions.append({
                "question": self._clean_output_text(f"Aşağıdaki cümlede boşluğu doldurun: {question_body}")[:240],
                "options": [self._clean_output_text(o) for o in options],
                "correct": options.index(ans),
            })

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

    def _ollama_generate(self, model: str, prompt: str, timeout: int = 60, system: Optional[str] = None, options: Optional[dict] = None) -> Optional[str]:
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

    def _generate_summary_with_ollama(self, context_text: str, max_length: int) -> Optional[str]:
        try:
            context = context_text[:8000]
            lang = self._guess_language(context)
            target_lang = "English" if lang == "english" else "Turkish"
            prompt = (
                f"Summarize the text in {target_lang}. Write 3-5 paragraphs, total ~220-380 words. "
                "Paragraph 1: high-level overview (what the document/chapter is about). "
                "Paragraphs 2-4: key themes, important mechanisms, and examples; keep chronological/section order if possible. "
                "Optional final paragraph: main takeaways or implications. "
                "Do not copy long sentences verbatim; paraphrase clearly. No bullets, no numbering, no reasoning steps—just plain paragraphs.\n\nText:\n" + context
            )
            system = (
                "You are a professional technical editor. You write fluent, clear summaries in the source language (English stays English, Turkish stays Turkish). "
                "You return 3-5 paragraphs of plain text, no bullets, no meta-commentary, no instructions, no filler like 'the text'. "
                "First paragraph is a broad overview; next paragraphs dive into key points; last may include the main takeaway."
            )
            resp = self._ollama_generate(
                self.ollama_summary_model,
                prompt,
                timeout=120,
                system=system,
                options={"temperature": 0.2},
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
            context = context_text[:5000]
            prompt = (
                "Metni oku ve metne dayalı {n} çoktan seçmeli soru üret. "
                "Her soru için 4 şık ver ve doğru şıkkın indeksini belirt. "
                "Yanıtı yalnızca JSON dizi olarak döndür: "
                "[{\"question\": str, \"options\": [str,str,str,str], \"correctIndex\": 0-3}]. "
                "Sorular metne spesifik olsun, genel ezber soruları olmasın.\n\nMetin:\n".format(n=count) + context
            )
            resp = self._ollama_generate(self.ollama_quiz_model, prompt, timeout=180)
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
                cleaned.append({
                    "question": self._clean_output_text(str(q))[:240],
                    "options": [self._clean_output_text(str(o)) for o in opts[:4]],
                    "correct": idx,
                })

            # If fewer than requested, fill the rest using template-based generation
            if len(cleaned) < count:
                remaining = count - len(cleaned)
                filler = self._generate_quiz_from_text(context_text, remaining)
                for f in filler:
                    if len(cleaned) >= count:
                        break
                    cleaned.append(f)

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
            # Find first [ ... ]
            match = re.search(r"\[.*\]", cleaned, flags=re.DOTALL)
            if match:
                cleaned = match.group(0)
            return json.loads(cleaned)
        except Exception:
            return None


# Global instance
llama_service = LlamaIndexService()
