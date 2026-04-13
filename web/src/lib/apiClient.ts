// Tüm API çağrıları için merkezi yardımcı

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("classy_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function register(data: {
  email: string;
  password: string;
  fullName: string;
  role: "STUDENT" | "INSTRUCTOR";
}) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return { ok: res.ok, data: await res.json() };
}

// ── Study Area ────────────────────────────────────────────────────────────────

export interface StudyNote {
  id: string;
  fileName: string;
  subject: string;
  processedStatus: "PENDING" | "COMPLETED" | "FAILED";
  uploadedAt: string;
}

export interface StudyQuiz {
  id: string;
  title: string;
  subject: string;
  score: number | null;
  createdAt: string;
}

export interface SubjectGroup {
  subject: string;
  items: { notes: StudyNote[]; quizzes: StudyQuiz[] };
}

export async function getStudyArea(): Promise<{
  ok: boolean;
  dashboard?: SubjectGroup[];
  error?: string;
}> {
  const res = await fetch("/api/study-area", {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error };
  return { ok: true, dashboard: data.dashboard };
}

// ── Notes / AI ────────────────────────────────────────────────────────────────

export interface GeneratedNote {
  noteId: string;
  subject: string;
  summary: string;
  flashcards: { front: string; back: string }[];
}

export async function generateNotes(
  file: File,
  subjectOverride?: string
): Promise<{ ok: boolean; data?: GeneratedNote; error?: string }> {
  const formData = new FormData();
  formData.append("file", file);
  if (subjectOverride) formData.append("subject_override", subjectOverride);

  const res = await fetch("/api/notes/generate", {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) return { ok: false, error: json.error };
  return {
    ok: true,
    data: { noteId: json.noteId, subject: json.subject, ...json.data },
  };
}

export async function deleteNote(noteId: string) {
  const res = await fetch(`/api/notes/${noteId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return { ok: res.ok };
}

// ── Quizzes ───────────────────────────────────────────────────────────────────

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  userAnswer: string | null;
}

export interface Quiz {
  id: string;
  title: string;
  subject: string;
  score: number | null;
  questions: QuizQuestion[];
}

export interface GeneratedQuizItem {
  question: string;
  options: string[];
  answer: string;
}

export interface GeneratedQuiz {
  quizId: string;
  quiz: GeneratedQuizItem[];
}

export async function generateQuiz(
  file: File,
  questionCount = 10,
  subjectOverride?: string
): Promise<{ ok: boolean; data?: GeneratedQuiz; error?: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("question_count", questionCount.toString());
  if (subjectOverride) formData.append("subject_override", subjectOverride);

  const res = await fetch("/api/quizzes/generate", {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) return { ok: false, error: json.error };
  return { ok: true, data: { quizId: json.quizId, quiz: json.data?.quiz ?? json.quiz } };
}

export async function getQuiz(
  quizId: string
): Promise<{ ok: boolean; quiz?: Quiz; error?: string }> {
  const res = await fetch(`/api/quizzes/${quizId}`, {
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false, error: json.error };
  return { ok: true, quiz: json.quiz };
}

export async function submitQuiz(
  quizId: string,
  answers: Record<string, string>
): Promise<{
  ok: boolean;
  score?: number;
  correctCount?: number;
  totalQuestions?: number;
  error?: string;
}> {
  const res = await fetch(`/api/quizzes/${quizId}/submit`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false, error: json.error };
  return {
    ok: true,
    score: json.score,
    correctCount: json.correctCount,
    totalQuestions: json.totalQuestions,
  };
}

export async function deleteQuiz(quizId: string) {
  const res = await fetch(`/api/quizzes/${quizId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return { ok: res.ok };
}

// ── Live Rooms ────────────────────────────────────────────────────────────────

export interface LiveRoom {
  name: string;
  url: string;
  privacy: string;
  createdAt: number;
}

export async function getLiveRooms(): Promise<{ ok: boolean; rooms?: LiveRoom[]; error?: string }> {
  const res = await fetch("/api/live-rooms", { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) return { ok: false, error: json.error };
  return { ok: true, rooms: json.rooms };
}

export async function createLiveRoom(name?: string): Promise<{
  ok: boolean;
  room?: { name: string; url: string };
  error?: string;
}> {
  const res = await fetch("/api/live-rooms", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false, error: json.error };
  return { ok: true, room: { name: json.name, url: json.url } };
}

export async function getMeetingToken(roomName: string): Promise<{
  ok: boolean;
  token?: string;
  isOwner?: boolean;
  roomUrl?: string;
  error?: string;
}> {
  const res = await fetch("/api/live-rooms/token", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ roomName }),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false, error: json.error };
  return { ok: true, token: json.token, isOwner: json.isOwner, roomUrl: json.roomUrl };
}
