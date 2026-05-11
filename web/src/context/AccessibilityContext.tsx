"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ACCESSIBILITY_STORAGE_KEY,
  AccessibilitySettings,
  defaultAccessibilitySettings,
  sanitizeAccessibilitySettings,
} from "@/lib/accessibility";

interface AccessibilityContextValue {
  settings: AccessibilitySettings;
  updateSettings: (patch: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(
  null,
);

function applyAccessibilitySettings(settings: AccessibilitySettings) {
  const root = document.documentElement;
  const body = document.body;

  root.dataset.classyFontSize = settings.fontSize;
  root.dataset.classyContrast = settings.highContrast ? "high" : "default";
  root.dataset.classyFocusMode = settings.focusMode ? "on" : "off";
  root.dataset.classyColorMode = settings.colorMode;
  root.dataset.classyReadAloud = settings.readAloud ? "on" : "off";
  body.dataset.classyAccessibilityReady = "true";
}

function loadStoredSettings() {
  try {
    const raw = window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
    if (!raw) {
      return defaultAccessibilitySettings;
    }

    return sanitizeAccessibilitySettings(
      JSON.parse(raw) as Partial<AccessibilitySettings>,
    );
  } catch {
    return defaultAccessibilitySettings;
  }
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(
    () =>
      typeof window === "undefined"
        ? defaultAccessibilitySettings
        : loadStoredSettings(),
  );

  useEffect(() => {
    applyAccessibilitySettings(settings);
    window.localStorage.setItem(
      ACCESSIBILITY_STORAGE_KEY,
      JSON.stringify(settings),
    );
  }, [settings]);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      settings,
      updateSettings: (patch) => {
        setSettings((current) =>
          sanitizeAccessibilitySettings({ ...current, ...patch }),
        );
      },
      resetSettings: () => {
        setSettings(defaultAccessibilitySettings);
      },
    }),
    [settings],
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);

  if (!context) {
    throw new Error(
      "useAccessibility must be used inside AccessibilityProvider",
    );
  }

  return context;
}
