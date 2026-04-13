"use client";

import { useEffect, useState, createContext, useContext, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const icons = {
    success: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    info: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const styles = {
    success: "bg-white dark:bg-zinc-800 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400",
    error: "bg-white dark:bg-zinc-800 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400",
    info: "bg-white dark:bg-zinc-800 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400",
  };

  const iconBg = {
    success: "bg-green-100 dark:bg-green-950/40",
    error: "bg-red-100 dark:bg-red-950/40",
    info: "bg-indigo-100 dark:bg-indigo-950/40",
  };

  return (
    <div
      onClick={onClose}
      style={{
        transition: "opacity 0.3s ease, transform 0.3s ease",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(24px)",
      }}
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg cursor-pointer max-w-xs ${styles[toast.type]}`}
    >
      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${iconBg[toast.type]}`}>
        {icons[toast.type]}
      </div>
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{toast.message}</p>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
