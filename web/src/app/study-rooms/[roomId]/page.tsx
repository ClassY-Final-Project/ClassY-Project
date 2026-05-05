"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";

interface Participant {
  id: string;
  studying: string | null;
  joinedAt: string;
  user: { id: string; fullName: string | null; avatarUrl: string | null };
}

interface StudyRoom {
  id: string;
  name: string;
  topic: string | null;
  type: "VOICE" | "SILENT";
  maxCapacity: number;
  isActive: boolean;
  isPrivate: boolean;
  inviteCode: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  createdById: string;
  createdBy: { id: string; fullName: string | null };
  participants: Participant[];
  _count: { participants: number };
}

const PRESETS = [
  { label: "25 / 5", work: 25, rest: 5, desc: "Klasik" },
  { label: "50 / 10", work: 50, rest: 10, desc: "Derin Odak" },
  { label: "90 / 20", work: 90, rest: 20, desc: "Uzun Seans" },
];

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}s ${m.toString().padStart(2, "0")}dk`;
  if (m > 0) return `${m}dk ${s.toString().padStart(2, "0")}sn`;
  return `${s}sn`;
}

function getParticipantSeconds(joinedAt: string) {
  return Math.floor((Date.now() - new Date(joinedAt).getTime()) / 1000);
}

function calcParticipantStats(
  joinedAt: string,
  scheduledStart: string | null,
  workMin: number,
  restMin: number
) {
  const now = Date.now();
  const joinTime = new Date(joinedAt).getTime();
  const effectiveStart = scheduledStart
    ? Math.max(new Date(scheduledStart).getTime(), joinTime)
    : joinTime;
  const elapsed = Math.floor((now - effectiveStart) / 1000);
  if (elapsed <= 0) return { studySecs: 0, breakSecs: 0 };

  const cycleLen = (workMin + restMin) * 60;
  const fullCycles = Math.floor(elapsed / cycleLen);
  let studySecs = fullCycles * workMin * 60;
  let breakSecs = fullCycles * restMin * 60;
  const pos = elapsed % cycleLen;
  if (pos <= workMin * 60) {
    studySecs += pos;
  } else {
    studySecs += workMin * 60;
    breakSecs += pos - workMin * 60;
  }
  return { studySecs, breakSecs };
}

function getSyncedTimer(scheduledStart: string, workMin: number, restMin: number) {
  const elapsed = Math.floor((Date.now() - new Date(scheduledStart).getTime()) / 1000);
  if (elapsed < 0) return { isBreak: false, remaining: workMin * 60, sessionCount: 0 };
  const cycleLen = (workMin + restMin) * 60;
  const sessionCount = Math.floor(elapsed / cycleLen);
  const posInCycle = elapsed % cycleLen;
  const isBreak = posInCycle >= workMin * 60;
  const remaining = isBreak
    ? cycleLen - posInCycle
    : workMin * 60 - posInCycle;
  return { isBreak, remaining, sessionCount };
}

export default function StudyRoomPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;
  const { showToast } = useToast();

  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [fetching, setFetching] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [studyingText, setStudyingText] = useState("");

  const [now, setNow] = useState(new Date());

  const [presetIdx, setPresetIdx] = useState(0);
  const [customWork, setCustomWork] = useState(25);
  const [customRest, setCustomRest] = useState(5);
  const [useCustom, setUseCustom] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [totalStudySeconds, setTotalStudySeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dailyContainerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<any>(null);
  const [dailyLoaded, setDailyLoaded] = useState(false);
  const [dailyError, setDailyError] = useState("");

  // Chat state for silent rooms
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{id: string; sender: string; senderId?: string; text: string; time: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOwner = room && user && room.createdById === user.id;
  const isAdmin = user?.role === "ADMIN";
  const isScheduled = !room?.isPrivate && !!room?.scheduledStart;
  const workMin = useCustom ? customWork : PRESETS[presetIdx].work;
  const restMin = useCustom ? customRest : PRESETS[presetIdx].rest;

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadRoom = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/study-rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { router.replace("/study-rooms"); return; }
      const json = await res.json();
      setRoom(json.room);
      if (user && json.room.participants.some((p: Participant) => p.user.id === user.id)) setJoined(true);
    } catch { router.replace("/study-rooms"); }
    finally { setFetching(false); }
  }, [token, roomId, user, router]);

  useEffect(() => {
    if (!token || !user) return;
    loadRoom();
    const i = setInterval(loadRoom, 10000);
    return () => clearInterval(i);
  }, [token, user, loadRoom]);

  // Check for room expiration
  useEffect(() => {
    if (!room?.scheduledEnd || !joined) return;
    if (now.getTime() > new Date(room.scheduledEnd).getTime()) {
      showToast("Odanın süresi doldu, kapanıyor.", "info");
      leaveRoom();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, room?.scheduledEnd, joined]);

  useEffect(() => {
    if (joined && room?.type === "VOICE" && dailyContainerRef.current && !callFrameRef.current) {
      loadDailyRoom();
    }
  }, [joined, room?.type]); // eslint-disable-line

  useEffect(() => {
    return () => {
      if (joined && token) {
        fetch(`/api/study-rooms/${roomId}/leave`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, keepalive: true });
      }
    };
  }, [joined, token, roomId]);

  useEffect(() => {
    if (isScheduled) return;
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => {
          if (s <= 1) {
            setTimerRunning(false);
            if (!isBreak) {
              setSessionCount(c => c + 1);
              showToast(`🎉 ${workMin} dk tamamlandı! Mola zamanı.`, "success");
              setIsBreak(true);
              return restMin * 60;
            } else {
              showToast("💪 Mola bitti! Çalışmaya devam.", "success");
              setIsBreak(false);
              return workMin * 60;
            }
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning, isBreak, workMin, restMin, isScheduled, showToast]);

  useEffect(() => {
    if (timerRunning && !isBreak) {
      totalRef.current = setInterval(() => setTotalStudySeconds(s => s + 1), 1000);
    } else {
      if (totalRef.current) clearInterval(totalRef.current);
    }
    return () => { if (totalRef.current) clearInterval(totalRef.current); };
  }, [timerRunning, isBreak]);

  function applyPreset(idx: number) {
    setPresetIdx(idx); setUseCustom(false); setTimerRunning(false);
    setIsBreak(false); setTimerSeconds(PRESETS[idx].work * 60);
  }

  async function joinRoom() {
    setJoining(true);
    try {
      const res = await fetch(`/api/study-rooms/${roomId}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ studying: studyingText || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setJoined(true);
      showToast("Odaya katıldınız!", "success");
      loadRoom();
    } catch (e: any) {
      showToast(e.message || "Katılınamadı.", "error");
    } finally { setJoining(false); }
  }

  const leaveRoom = useCallback(async () => {
    try {
      await fetch(`/api/study-rooms/${roomId}/leave`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (callFrameRef.current) {
        await callFrameRef.current.leave().catch(() => {});
        callFrameRef.current.destroy(); callFrameRef.current = null;
      }
      setJoined(false); setTimerRunning(false);
      router.push("/study-rooms");
    } catch { showToast("Bir hata oluştu.", "error"); }
  }, [roomId, token, router, showToast]);

  async function closeRoom() {
    if (!confirm("Odayı kapatmak istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/study-rooms/${roomId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      showToast("Oda kapatıldı.", "success");
      router.push("/study-rooms");
    } catch { showToast("Oda kapatılamadı.", "error"); }
  }

  async function loadDailyRoom() {
    if (!dailyContainerRef.current) return;
    setDailyError("");
    try {
      const DailyIframe = (await import("@daily-co/daily-js")).default;
      const res = await fetch(`/api/study-rooms/${roomId}/token`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      callFrameRef.current = DailyIframe.createFrame(dailyContainerRef.current, {
        iframeStyle: { width: "100%", height: "100%", border: "none", borderRadius: "12px" },
        showLeaveButton: false, showFullscreenButton: true,
        showParticipantsBar: false,
        cssText: `
          button[aria-label*="Chat"],
          button[aria-label*="Sohbet"],
          button[data-testid="chat-button"],
          .daily-chat-button {
            display: none !important;
          }
        `
      });
      setDailyLoaded(true);
      await callFrameRef.current.join({ url: json.roomUrl, token: json.token });
    } catch (e: any) { setDailyError(e.message || "Sesli oda yüklenemedi."); }
  }

  function copyInviteLink() {
    if (!room?.inviteCode) return;
    navigator.clipboard.writeText(`${window.location.origin}/study-rooms/join/${room.inviteCode}`);
    showToast("Davet linki kopyalandı!", "success");
  }

  // --- Chat functions ---
  const loadChat = useCallback(async (afterTime?: string) => {
    if (!token) return;
    try {
      const url = afterTime
        ? `/api/study-rooms/${roomId}/chat?after=${encodeURIComponent(afterTime)}`
        : `/api/study-rooms/${roomId}/chat`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.messages && json.messages.length > 0) {
        setChatMessages(prev => {
          const ids = new Set(prev.map(m => m.id));
          const newMsgs = json.messages.filter((m: any) => !ids.has(m.id));
          return [...prev, ...newMsgs];
        });
      }
    } catch {}
  }, [token, roomId]);

  async function sendChat() {
    if (!chatInput.trim() || !token) return;
    const text = chatInput.trim();
    setChatInput("");
    try {
      const res = await fetch(`/api/study-rooms/${roomId}/chat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (json.message) {
        setChatMessages(prev => {
          const ids = new Set(prev.map(m => m.id));
          if (ids.has(json.message.id)) return prev;
          return [...prev, json.message];
        });
      }
    } catch {}
  }

  useEffect(() => {
    if (!joined || !chatOpen) return;
    loadChat();
    chatPollRef.current = setInterval(() => {
      setChatMessages(prev => {
        const last = prev.length > 0 ? prev[prev.length - 1].time : undefined;
        loadChat(last);
        return prev;
      });
    }, 3000);
    return () => { if (chatPollRef.current) clearInterval(chatPollRef.current); };
  }, [joined, chatOpen, loadChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  function formatTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  }

  function timerProgress(remaining: number, totalMin: number) {
    return ((totalMin * 60 - remaining) / (totalMin * 60)) * 100;
  }

  const clockStr = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

  const syncedTimer = isScheduled && room?.scheduledStart
    ? getSyncedTimer(room.scheduledStart, 25, 5)
    : null;

  if (loading || fetching) {
    return (
      <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!room) return null;

  if (!joined) {
    return (
      <div className="w-full flex-1 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-900 border border-zinc-200 dark:border-gray-700 rounded-2xl p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">{room.type === "VOICE" ? "🎙️" : "🤫"}</div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">{room.name}</h1>
          {room.topic && <p className="text-zinc-500 dark:text-gray-400 mb-2">{room.topic}</p>}
          {room.scheduledStart && room.scheduledEnd && (
            <p className="text-yellow-600 dark:text-yellow-400/80 text-sm mb-3">
              🕐 {new Date(room.scheduledStart).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} – {new Date(room.scheduledEnd).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 mb-6 text-sm text-zinc-500 dark:text-gray-500">
            <span className={`px-2 py-0.5 rounded-full text-xs ${room.type === "VOICE" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-zinc-100 dark:bg-gray-800 text-zinc-600 dark:text-gray-400"}`}>
              {room.type === "VOICE" ? "🎙️ Sesli" : "🤫 Sessiz"}
            </span>
            <span>{room._count.participants} / {room.maxCapacity} kişi</span>
            {room.isPrivate && <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">🔐 Özel</span>}
          </div>
          <input
            value={studyingText}
            onChange={e => setStudyingText(e.target.value)}
            placeholder="Ne çalışıyorsunuz? (isteğe bağlı)"
            className="w-full bg-zinc-100 dark:bg-gray-800 border border-zinc-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-gray-500 focus:outline-none focus:border-purple-500 mb-4"
          />
          <button onClick={joinRoom} disabled={joining || room._count.participants >= room.maxCapacity}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50">
            {joining ? "Katılınıyor..." : room._count.participants >= room.maxCapacity ? "Oda Dolu" : "Odaya Katıl"}
          </button>
          <button onClick={() => router.push("/study-rooms")} className="mt-3 w-full text-zinc-400 dark:text-gray-500 hover:text-zinc-700 dark:hover:text-gray-300 py-2 text-sm transition-colors">
            ← Geri Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col overflow-hidden bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-white">
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{room.type === "VOICE" ? "🎙️" : "🤫"}</span>
          <div>
            <h1 className="text-base font-bold leading-tight text-zinc-900 dark:text-white">{room.name}</h1>
            {room.topic && <p className="text-zinc-500 dark:text-gray-500 text-xs">{room.topic}</p>}
          </div>
          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300/50 dark:border-green-800/50 px-2 py-0.5 rounded-full animate-pulse">
            {room._count.participants} aktif
          </span>
          {room.isPrivate && (
            <button onClick={copyInviteLink} className="text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-300/40 dark:border-purple-800/30 px-2 py-0.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/40 transition-colors">
              🔗 Davet Linki
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setChatOpen(v => !v)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors border ${chatOpen ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-300/50 dark:border-indigo-800/50" : "bg-zinc-100 dark:bg-gray-800 text-zinc-700 dark:text-white border-zinc-200 dark:border-gray-700 hover:bg-zinc-200 dark:hover:bg-gray-700"}`}>
            💬 Sohbet
          </button>
          {(isOwner || isAdmin) && (
            <button onClick={closeRoom} className="px-3 py-1.5 text-xs text-red-500 dark:text-red-400 border border-red-300/50 dark:border-red-800/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Odayı Kapat</button>
          )}
          <button onClick={leaveRoom} className="px-4 py-1.5 text-xs bg-zinc-100 dark:bg-gray-800 hover:bg-zinc-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-zinc-700 dark:text-white">Ayrıl</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Ana Alan */}
        <div className="lg:col-span-2 space-y-5">

          {room.type === "VOICE" && (
            <div ref={dailyContainerRef} className="w-full h-[500px] bg-zinc-100 dark:bg-gray-900 border border-zinc-200 dark:border-gray-700 rounded-xl overflow-hidden relative">
              {!dailyLoaded && !dailyError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-zinc-500 dark:text-gray-400 text-sm">Sesli oda yükleniyor...</p>
                  </div>
                </div>
              )}
              {dailyError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-red-500 dark:text-red-400 mb-3">{dailyError}</p>
                    <button onClick={loadDailyRoom} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors">Tekrar Dene</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Duvar Saati */}
              <div className="bg-white dark:bg-gray-900 border border-zinc-200 dark:border-gray-800 rounded-xl p-6 text-center">
                <p className="text-6xl font-mono font-bold text-zinc-900 dark:text-white tracking-wider tabular-nums">{clockStr}</p>
                <p className="text-zinc-400 dark:text-gray-500 text-sm mt-2 capitalize">{dateStr}</p>
                {room.scheduledStart && room.scheduledEnd && (
                  <p className="text-yellow-600 dark:text-yellow-400/70 text-xs mt-1">
                    Oturum: {new Date(room.scheduledStart).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} – {new Date(room.scheduledEnd).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                {!isScheduled && (
                  <div className="flex items-center justify-center gap-8 mt-5">
                    <div>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{sessionCount}</p>
                      <p className="text-zinc-400 dark:text-gray-600 text-xs">tamamlanan seans</p>
                    </div>
                    <div className="w-px h-8 bg-zinc-200 dark:bg-gray-800" />
                    <div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatDuration(totalStudySeconds)}</p>
                      <p className="text-zinc-400 dark:text-gray-600 text-xs">toplam çalışma</p>
                    </div>
                  </div>
                )}
                {isScheduled && syncedTimer && (
                  <div className="flex items-center justify-center gap-8 mt-5">
                    <div>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{syncedTimer.sessionCount}</p>
                      <p className="text-zinc-400 dark:text-gray-600 text-xs">tamamlanan seans</p>
                    </div>
                    <div className="w-px h-8 bg-zinc-200 dark:bg-gray-800" />
                    <div>
                      <p className={`text-2xl font-bold ${syncedTimer.isBreak ? "text-green-600 dark:text-green-400" : "text-purple-600 dark:text-purple-400"}`}>
                        {syncedTimer.isBreak ? "Mola" : "Odak"}
                      </p>
                      <p className="text-zinc-400 dark:text-gray-600 text-xs">şu an</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Pomodoro */}
              <div className="bg-white dark:bg-gray-900 border border-zinc-200 dark:border-gray-800 rounded-xl p-6">
                {isScheduled && syncedTimer ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">⏱ Ortak Pomodoro (25/5)</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${syncedTimer.isBreak ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"}`}>
                        {syncedTimer.isBreak ? "☕ Mola" : "📖 Odak"}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="relative w-32 h-32 shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="44" fill="none" stroke="#e4e4e7" className="dark:stroke-[#1f2937]" strokeWidth="7" />
                          <circle cx="50" cy="50" r="44" fill="none"
                            stroke={syncedTimer.isBreak ? "#10b981" : "#8b5cf6"}
                            strokeWidth="7" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 44}`}
                            strokeDashoffset={`${2 * Math.PI * 44 * (1 - timerProgress(syncedTimer.remaining, syncedTimer.isBreak ? 5 : 25) / 100)}`}
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-mono font-bold text-zinc-900 dark:text-white tabular-nums">{formatTime(syncedTimer.remaining)}</span>
                          <span className={`text-xs ${syncedTimer.isBreak ? "text-green-600 dark:text-green-400" : "text-purple-600 dark:text-purple-400"}`}>kaldı</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-zinc-500 dark:text-gray-400 text-sm">Herkesle aynı anda çalışıyorsunuz.</p>
                        <p className="text-zinc-400 dark:text-gray-600 text-xs mt-1">Timer odadaki herkesle senkronize.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 mb-5">
                      {PRESETS.map((p, i) => (
                        <button key={i} onClick={() => applyPreset(i)}
                          className={`flex-1 py-2 rounded-lg text-sm transition-colors ${!useCustom && presetIdx === i ? "bg-purple-600 text-white" : "bg-zinc-100 dark:bg-gray-800 text-zinc-600 dark:text-gray-400 hover:bg-zinc-200 dark:hover:bg-gray-700"}`}>
                          <span className="font-medium">{p.label}</span>
                          <span className="block text-xs opacity-60">{p.desc}</span>
                        </button>
                      ))}
                      <button onClick={() => { setUseCustom(true); setTimerRunning(false); setIsBreak(false); setTimerSeconds(customWork * 60); }}
                        className={`flex-1 py-2 rounded-lg text-sm transition-colors ${useCustom ? "bg-purple-600 text-white" : "bg-zinc-100 dark:bg-gray-800 text-zinc-600 dark:text-gray-400 hover:bg-zinc-200 dark:hover:bg-gray-700"}`}>
                        <span className="font-medium">Özel</span>
                        <span className="block text-xs opacity-60">Kendin ayarla</span>
                      </button>
                    </div>
                    {useCustom && (
                      <div className="flex gap-3 mb-5">
                        <div className="flex-1">
                          <label className="text-xs text-zinc-500 dark:text-gray-500 mb-1 block">Çalışma (dk)</label>
                          <input type="number" min={1} max={180} value={customWork}
                            onChange={e => { const v = parseInt(e.target.value) || 1; setCustomWork(v); if (!timerRunning && !isBreak) setTimerSeconds(v * 60); }}
                            className="w-full bg-zinc-100 dark:bg-gray-800 border border-zinc-200 dark:border-gray-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500 text-sm" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-zinc-500 dark:text-gray-500 mb-1 block">Mola (dk)</label>
                          <input type="number" min={1} max={60} value={customRest}
                            onChange={e => setCustomRest(parseInt(e.target.value) || 1)}
                            className="w-full bg-zinc-100 dark:bg-gray-800 border border-zinc-200 dark:border-gray-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500 text-sm" />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-8">
                      <div className="relative w-36 h-36 shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="44" fill="none" stroke="#e4e4e7" className="dark:stroke-[#1f2937]" strokeWidth="7" />
                          <circle cx="50" cy="50" r="44" fill="none"
                            stroke={isBreak ? "#10b981" : "#8b5cf6"}
                            strokeWidth="7" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 44}`}
                            strokeDashoffset={`${2 * Math.PI * 44 * (1 - timerProgress(timerSeconds, isBreak ? restMin : workMin) / 100)}`}
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-mono font-bold text-zinc-900 dark:text-white tabular-nums">{formatTime(timerSeconds)}</span>
                          <span className={`text-xs mt-0.5 ${isBreak ? "text-green-600 dark:text-green-400" : "text-purple-600 dark:text-purple-400"}`}>{isBreak ? "Mola" : "Odak"}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-zinc-500 dark:text-gray-400 text-sm mb-3">{isBreak ? "☕ Molanı iyi kullan." : `📖 ${workMin} dk çalış, ${restMin} dk mola.`}</p>
                        <div className="flex gap-2">
                          <button onClick={() => setTimerRunning(r => !r)}
                            className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors ${timerRunning ? "bg-zinc-200 dark:bg-gray-700 hover:bg-zinc-300 dark:hover:bg-gray-600 text-zinc-800 dark:text-white" : "bg-purple-600 hover:bg-purple-700 text-white"}`}>
                            {timerRunning ? "⏸ Durdur" : "▶ Başlat"}
                          </button>
                          <button onClick={() => { setTimerRunning(false); setIsBreak(false); setTimerSeconds(workMin * 60); }}
                            className="px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-gray-700 text-zinc-500 dark:text-gray-400 hover:bg-zinc-100 dark:hover:bg-gray-800 text-sm transition-colors">↺</button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
        </div>

        {/* Sağ: Katılımcılar + süreleri */}
        <div className="bg-white dark:bg-gray-900 border border-zinc-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-zinc-500 dark:text-gray-500 uppercase tracking-wider mb-4">
            Şu an çalışıyor ({room._count.participants})
          </h2>
          <div className="space-y-3 max-h-140 overflow-y-auto">
            {room.participants.length === 0 ? (
              <p className="text-zinc-400 dark:text-gray-600 text-sm text-center py-6">Henüz kimse yok</p>
            ) : (
              room.participants.map(p => {
                const isSelf = p.user.id === user?.id;
                const { studySecs, breakSecs } = calcParticipantStats(
                  p.joinedAt,
                  room.scheduledStart,
                  25, 5
                );
                const totalSecs = getParticipantSeconds(p.joinedAt);
                return (
                  <div key={p.id} className={`p-2.5 rounded-lg ${isSelf ? "bg-purple-50 dark:bg-purple-900/10 border border-purple-200/50 dark:border-purple-800/20" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${isSelf ? "bg-purple-600" : "bg-zinc-300 dark:bg-gray-700"}`}>
                        {(p.user.fullName || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-zinc-900 dark:text-white text-sm font-medium truncate">
                          {p.user.fullName || "Anonim"}
                          {isSelf && <span className="text-purple-600 dark:text-purple-400 text-xs ml-1">(sen)</span>}
                        </p>
                        <p className="text-zinc-400 dark:text-gray-600 text-xs truncate">
                          {p.studying ? `📚 ${p.studying}` : "Çalışıyor..."}
                        </p>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                    </div>
                    <div className="flex gap-2 mt-2 ml-12">
                      <span className="text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full">
                        📖 {formatDuration(room.scheduledStart ? studySecs : totalSecs)}
                      </span>
                      {room.scheduledStart && breakSecs > 0 && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                          ☕ {formatDuration(breakSecs)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          </div>

      </div>
      </div>

      {/* Chat Panel */}
      {chatOpen && (
        <div className="fixed right-0 w-80 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-40 flex flex-col" style={{ top: '65px', bottom: '0' }}>
          <div className="shrink-0 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">💬 Oda Sohbeti</h3>
            <button onClick={() => setChatOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {chatMessages.length === 0 && (
              <p className="text-center text-zinc-400 dark:text-zinc-600 text-sm py-8">Henüz mesaj yok.<br/>İlk mesajı sen gönder! 💬</p>
            )}
            {chatMessages.map(m => {
              const isSelf = m.senderId === user?.id;
              return (
                <div key={m.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                  {!isSelf && <span className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5 font-medium">{m.sender}</span>}
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                    isSelf
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-bl-md'
                  }`}>
                    {m.text}
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">{new Date(m.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <div className="shrink-0 px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Mesaj yaz..."
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500"
              />
              <button onClick={sendChat} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">↑</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
