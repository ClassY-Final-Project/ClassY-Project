"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmContextType {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  function handleConfirm() {
    state?.resolve(true);
    setState(null);
  }

  function handleCancel() {
    state?.resolve(false);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={handleCancel}
        >
          {/* Arka plan overlay */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal kutu */}
          <div
            className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "modalIn 0.18s cubic-bezier(.22,.68,0,1.2)" }}
          >
            {/* İkon */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
              state.danger
                ? "bg-red-100 dark:bg-red-950/40"
                : "bg-amber-100 dark:bg-amber-950/40"
            }`}>
              {state.danger ? (
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>

            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">{state.title}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">{state.message}</p>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {state.cancelText ?? "İptal"}
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${
                  state.danger
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {state.confirmText ?? "Onayla"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}
