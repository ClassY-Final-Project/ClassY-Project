const responseMeta = document.querySelector("#response-meta");
const aiDot = document.querySelector("#ai-status-dot");
const aiText = document.querySelector("#ai-status-text");

const errorBox = document.querySelector("#error-box");
const quizResult = document.querySelector("#quiz-result");
const quizInfo = document.querySelector("#quiz-info");
const quizList = document.querySelector("#quiz-list");

const studyResult = document.querySelector("#study-result");
const summaryText = document.querySelector("#summary-text");
const flashcardsGrid = document.querySelector("#flashcards-grid");

boot();

function boot() {
  document.querySelector("#check-health").addEventListener("click", checkHealth);
  document.querySelector("#quiz-form").addEventListener("submit", onGenerateQuiz);
  document.querySelector("#study-form").addEventListener("submit", onGenerateStudy);
  checkHealth();
}

async function checkHealth() {
  aiDot.className = "status-dot";
  aiText.textContent = "AI: kontrol ediliyor...";

  const ai = await apiCall({ path: "/", method: "GET" });
  const isOk = ai.status >= 200 && ai.status < 300;

  aiDot.classList.add(isOk ? "ok" : "bad");
  aiText.textContent = isOk
    ? "AI: baglandi"
    : `AI: baglanamadi (${ai.status || "hata"})`;
}

async function onGenerateQuiz(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const file = formData.get("file");
  const questionCount = formData.get("question_count");

  if (!(file instanceof File) || !file.name) {
    showError("Lutfen quiz icin bir PDF dosyasi sec.");
    return;
  }

  clearError();
  setMeta("Quiz uretiliyor...");

  const payload = new FormData();
  payload.append("file", file);
  payload.append("question_count", String(questionCount || 10));

  const res = await apiCall({
    path: "/generate-quiz",
    method: "POST",
    formData: payload,
  });

  if (res.status >= 200 && res.status < 300 && Array.isArray(res.data?.quiz)) {
    renderQuizResult(res.data);
    return;
  }

  showError(readableError(res.data));
}

async function onGenerateStudy(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const file = formData.get("file");

  if (!(file instanceof File) || !file.name) {
    showError("Lutfen not ve flashcard icin bir PDF dosyasi sec.");
    return;
  }

  clearError();
  setMeta("Notlar ve flashcardlar uretiliyor...");

  const payload = new FormData();
  payload.append("file", file);

  const res = await apiCall({
    path: "/generate-study-notes",
    method: "POST",
    formData: payload,
  });

  if (res.status >= 200 && res.status < 300 && res.data?.data) {
    renderStudyResult(res.data);
    return;
  }

  showError(readableError(res.data));
}

async function apiCall({ path, method = "GET", formData }) {
  const base = "/proxy/ai";
  const normalizedPath = String(path || "/").startsWith("/") ? String(path || "/") : `/${String(path)}`;
  const url = `${base}${normalizedPath}`;
  const options = { method };

  if (formData) {
    options.body = formData;
  }

  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return { status: res.status, data };
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message || "Istek basarisiz" },
    };
  }
}

function setMeta(text) {
  const timestamp = new Date().toLocaleTimeString("tr-TR");
  responseMeta.textContent = `[${timestamp}] ${text}`;
}

function renderQuizResult(payload) {
  clearError();
  hideAllResults();

  const items = Array.isArray(payload.quiz) ? payload.quiz : [];
  quizInfo.textContent = `${payload.actual_count || items.length} soru olusturuldu. Kaynak dosya: ${
    payload.source_file || "Bilinmiyor"
  }`;

  quizList.innerHTML = "";

  items.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "quiz-item";

    const q = document.createElement("p");
    q.className = "quiz-question";
    q.textContent = `${index + 1}. ${item.question || "Soru metni yok"}`;

    const options = document.createElement("ul");
    options.className = "quiz-options";

    (item.options || []).forEach((opt) => {
      const optionItem = document.createElement("li");
      optionItem.textContent = opt;
      options.appendChild(optionItem);
    });

    const answer = document.createElement("p");
    answer.className = "quiz-answer";
    answer.textContent = `Dogru cevap: ${item.answer || "Bilinmiyor"}`;

    li.appendChild(q);
    li.appendChild(options);
    li.appendChild(answer);
    quizList.appendChild(li);
  });

  quizResult.classList.remove("hidden");
  setMeta("Quiz sonucu guncellendi.");
}

function renderStudyResult(payload) {
  clearError();
  hideAllResults();

  const data = payload.data || {};
  const summary = data.summary || "Ozet bulunamadi.";
  const flashcards = Array.isArray(data.flashcards) ? data.flashcards : [];

  summaryText.textContent = summary;
  flashcardsGrid.innerHTML = "";

  flashcards.forEach((card, index) => {
    const wrapper = document.createElement("article");
    wrapper.className = "flashcard";

    const head = document.createElement("h4");
    head.textContent = `Flashcard ${index + 1}`;

    const front = document.createElement("p");
    const frontLabel = document.createElement("strong");
    frontLabel.textContent = "On: ";
    front.appendChild(frontLabel);
    front.appendChild(document.createTextNode(card.front || "-"));

    const back = document.createElement("p");
    const backLabel = document.createElement("strong");
    backLabel.textContent = "Arka: ";
    back.appendChild(backLabel);
    back.appendChild(document.createTextNode(card.back || "-"));

    wrapper.appendChild(head);
    wrapper.appendChild(front);
    wrapper.appendChild(back);
    flashcardsGrid.appendChild(wrapper);
  });

  studyResult.classList.remove("hidden");
  setMeta(`Not ve flashcard sonucu guncellendi. (${flashcards.length} kart)`);
}

function readableError(data) {
  if (!data) return "Bilinmeyen bir hata olustu.";
  if (typeof data.error === "string") return data.error;
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.raw === "string" && data.raw.trim()) return data.raw;
  if (typeof data.message === "string") return data.message;
  return "Islem basarisiz oldu. AI servisini ve PDF dosyasini kontrol et.";
}

function showError(message) {
  hideAllResults();
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
  setMeta("Islem tamamlanamadi.");
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

function hideAllResults() {
  quizResult.classList.add("hidden");
  studyResult.classList.add("hidden");
  errorBox.classList.add("hidden");
}
