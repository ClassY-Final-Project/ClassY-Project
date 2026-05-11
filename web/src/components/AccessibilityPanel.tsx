"use client";

import { createPortal } from "react-dom";
import { type CSSProperties, useEffect, useId, useRef, useState } from "react";

import { useAccessibility } from "@/context/AccessibilityContext";

const fontSizeOptions = [
  { value: "small", label: "Küçük" },
  { value: "normal", label: "Normal" },
  { value: "large", label: "Büyük" },
  { value: "x-large", label: "Çok Büyük" },
] as const;

const colorModeOptions = [
  { value: "default", label: "Varsayılan" },
  { value: "protanopia", label: "Protanopia" },
  { value: "deuteranopia", label: "Deuteranopia" },
  { value: "tritanopia", label: "Tritanopia" },
  { value: "grayscale", label: "Gri Tonlama" },
] as const;

interface AccessibilityPanelProps {
  buttonClassName?: string;
  panelClassName?: string;
  mobileLabel?: boolean;
}

function PlaceholderNote() {
  return (
    <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
      Ayarlar kaydedilir ve root attribute&apos;ları uygulanır.
    </p>
  );
}

function ToggleSwitch({
  pressed,
  label,
  onToggle,
}: {
  pressed: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      data-classy-control="toggle"
      data-state={pressed ? "active" : "inactive"}
      className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${
        pressed ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
      }`}
      aria-label={label}
      aria-pressed={pressed}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white transition-transform ${
          pressed ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function ToggleCard({
  title,
  pressed,
  onToggle,
}: {
  title: string;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      data-classy-surface="panel-card"
      className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-white/5 dark:bg-white/[0.03]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-white">{title}</p>
          <PlaceholderNote />
        </div>
        <ToggleSwitch pressed={pressed} label={title} onToggle={onToggle} />
      </div>
    </div>
  );
}

function FontSizeOptionButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-classy-control="choice"
      data-state={active ? "active" : "inactive"}
      className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300"
          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

export default function AccessibilityPanel({
  buttonClassName,
  panelClassName,
  mobileLabel = false,
}: AccessibilityPanelProps) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const { settings, updateSettings, resetSettings } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const canUseDOM = typeof document !== "undefined";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;

      if (!trigger || !panel) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const horizontalPadding = 16;
      const gutter = 12;
      const desiredWidth = mobileLabel ? rect.width : 352;
      const width = Math.min(
        Math.max(desiredWidth, mobileLabel ? 0 : 320),
        viewportWidth - horizontalPadding * 2,
      );
      const top = Math.min(rect.bottom + gutter, viewportHeight - 24);
      const availableHeight = Math.max(240, viewportHeight - top - 16);
      const maxHeight = Math.min(availableHeight, Math.max(320, viewportHeight - 96));

      let left = mobileLabel ? rect.left : rect.right - width;
      left = Math.max(
        horizontalPadding,
        Math.min(left, viewportWidth - width - horizontalPadding),
      );

      setPanelStyle({
        top,
        left,
        width,
        maxHeight,
      });
    };

    const animationFrame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, mobileLabel]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const trigger = triggerRef.current;
      const panel = panelRef.current;

      if (trigger?.contains(target) || panel?.contains(target)) {
        return;
      }

      setIsOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const panel =
    canUseDOM && isOpen
      ? createPortal(
          <section
            id={panelId}
            ref={panelRef}
            aria-label="Erişilebilirlik paneli"
            data-classy-surface="panel"
            style={panelStyle}
            className={`fixed z-[120] flex max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[28px] border border-zinc-200/80 bg-white/95 shadow-[0_24px_80px_rgba(9,9,11,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95 ${panelClassName ?? ""}`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 dark:border-white/5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Erişilebilirlik
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Görünüm ve öğrenme odaklı ayarlar
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                data-classy-control="icon-button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                aria-label="Paneli kapat"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
              <div
                data-classy-surface="panel-card"
                className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-white/5 dark:bg-white/[0.03]"
              >
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      Yazı Boyutu
                    </p>
                    <PlaceholderNote />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {fontSizeOptions.map((option) => (
                      <FontSizeOptionButton
                        key={option.value}
                        active={settings.fontSize === option.value}
                        label={option.label}
                        onClick={() => updateSettings({ fontSize: option.value })}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <ToggleCard
                  title="Yüksek Kontrast"
                  pressed={settings.highContrast}
                  onToggle={() => updateSettings({ highContrast: !settings.highContrast })}
                />
                <ToggleCard
                  title="Odak Modu"
                  pressed={settings.focusMode}
                  onToggle={() => updateSettings({ focusMode: !settings.focusMode })}
                />
              </div>

              <div
                data-classy-surface="panel-card"
                className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-white/5 dark:bg-white/[0.03]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      Renk Modu
                    </p>
                    <PlaceholderNote />
                  </div>
                  <select
                    value={settings.colorMode}
                    data-classy-control="select"
                    onChange={(event) =>
                      updateSettings({
                        colorMode: event.target.value as typeof settings.colorMode,
                      })
                    }
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none transition-colors focus:border-indigo-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 sm:w-44"
                  >
                    {colorModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <ToggleCard
                title="Sesli Okuma"
                pressed={settings.readAloud}
                onToggle={() => updateSettings({ readAloud: !settings.readAloud })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-5 py-4 dark:border-white/5">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Ayarlar localStorage ile korunur
              </span>
              <button
                type="button"
                onClick={resetSettings}
                data-classy-control="reset"
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white"
              >
                Sıfırla
              </button>
            </div>
          </section>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
        data-classy-control="icon-button"
        className={
          buttonClassName ??
          "flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-200"
        }
      >
        <span className="sr-only">Erişilebilirlik</span>
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.9}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5a2.25 2.25 0 110 4.5 2.25 2.25 0 010-4.5zm0 6.25c-1.2 0-2.25.73-2.25 1.625S10.8 14 12 14s2.25-.73 2.25-1.625S13.2 10.75 12 10.75zm0 4.25a1 1 0 00-1 1v3.5a1 1 0 102 0V16a1 1 0 00-1-1zm-4.75-2a1 1 0 100 2H10a1 1 0 100-2H7.25zm6.75 0a1 1 0 100 2h2.75a1 1 0 100-2H14z"
          />
        </svg>
        {mobileLabel ? (
          <span className="ml-3 text-sm font-semibold">Erişilebilirlik</span>
        ) : null}
      </button>
      {panel}
    </>
  );
}
