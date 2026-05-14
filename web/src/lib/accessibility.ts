export type AccessibilityFontSize = "small" | "normal" | "large" | "x-large";
export type AccessibilityColorMode =
  | "default"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "grayscale";

export interface AccessibilitySettings {
  fontSize: AccessibilityFontSize;
  highContrast: boolean;
  focusMode: boolean;
  colorMode: AccessibilityColorMode;
  readAloud: boolean;
}

export const ACCESSIBILITY_STORAGE_KEY = "classy_accessibility_settings";

export const defaultAccessibilitySettings: AccessibilitySettings = {
  fontSize: "normal",
  highContrast: false,
  focusMode: false,
  colorMode: "default",
  readAloud: false,
};

export function sanitizeAccessibilitySettings(
  value: Partial<AccessibilitySettings> | null | undefined,
): AccessibilitySettings {
  return {
    fontSize:
      value?.fontSize === "small" ||
      value?.fontSize === "large" ||
      value?.fontSize === "x-large"
        ? value.fontSize
        : "normal",
    highContrast: Boolean(value?.highContrast),
    focusMode: Boolean(value?.focusMode),
    colorMode:
      value?.colorMode === "protanopia" ||
      value?.colorMode === "deuteranopia" ||
      value?.colorMode === "tritanopia" ||
      value?.colorMode === "grayscale"
        ? value.colorMode
        : "default",
    readAloud: Boolean(value?.readAloud),
  };
}

export function getAccessibilityBootScript() {
  return `
    (function() {
      var STORAGE_KEY = "${ACCESSIBILITY_STORAGE_KEY}";
      var defaults = ${JSON.stringify(defaultAccessibilitySettings)};
      var root = document.documentElement;
      var body = document.body;

      function sanitize(value) {
        return {
          fontSize: value && (value.fontSize === "small" || value.fontSize === "large" || value.fontSize === "x-large") ? value.fontSize : (value && value.fontSize === "default" ? "normal" : defaults.fontSize),
          highContrast: Boolean(value && value.highContrast),
          focusMode: Boolean(value && value.focusMode),
          colorMode: value && (value.colorMode === "protanopia" || value.colorMode === "deuteranopia" || value.colorMode === "tritanopia" || value.colorMode === "grayscale") ? value.colorMode : defaults.colorMode,
          readAloud: Boolean(value && value.readAloud)
        };
      }

      function apply(settings) {
        root.dataset.classyFontSize = settings.fontSize;
        root.dataset.classyContrast = settings.highContrast ? "high" : "default";
        root.dataset.classyFocusMode = settings.focusMode ? "on" : "off";
        root.dataset.classyColorMode = settings.colorMode;
        root.dataset.classyReadAloud = settings.readAloud ? "on" : "off";
        if (body) {
          body.dataset.classyAccessibilityReady = "true";
        }
      }

      try {
        var raw = window.localStorage.getItem(STORAGE_KEY);
        var parsed = raw ? JSON.parse(raw) : defaults;
        apply(sanitize(parsed));
      } catch (error) {
        apply(defaults);
      }
    })();
  `;
}

// --- SESLİ OKUMA (TEXT-TO-SPEECH) YARDIMCI FONKSİYONLARI ---

export const stopSpeaking = () => {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

export const speakText = (text: string, onEnd?: () => void) => {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  // Önceki okumaları temizle (üst üste binmemesi için)
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Tarayıcıdaki sesleri al ve Türkçe olanı bul
  const voices = window.speechSynthesis.getVoices();
  const turkishVoice = voices.find(
    (v) => v.lang.includes("tr-TR") || v.lang.includes("tr"),
  );

  if (turkishVoice) {
    utterance.voice = turkishVoice;
  } else {
    // Ses dosyası bulunamazsa varsayılan dili Türkçe olarak zorla
    utterance.lang = "tr-TR";
  }

  // Okuma ayarları
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Okuma bittiğinde dışarıya (bileşene) haber ver
  if (onEnd) {
    utterance.onend = onEnd;
  }

  window.speechSynthesis.speak(utterance);
};
