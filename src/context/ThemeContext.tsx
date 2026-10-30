import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark";
export type AccentGroup = "basic" | "jewel" | "neon" | "soft";
export type AccentKey = "sky" | "blue" | "indigo" | "violet" | "fuchsia" | "rose" | "red" | "orange" | "amber" | "lime" | "emerald" | "teal" | "cyan" | "neon" | "neonGreen" | "neonPink" | "neonPurple" | "powder" | "lavender" | "blush" | "sage" | "slate";

type AccentOption = { key: AccentKey; group: AccentGroup; label: string; color: string; soft: string; glow?: string; foreground?: string };

export const accentGroups: Array<{ key: AccentGroup; label: string; description: string }> = [
  { key: "basic", label: "Basic", description: "Clear, versatile colors" },
  { key: "jewel", label: "Jewel", description: "Deep, saturated tones" },
  { key: "neon", label: "Neon", description: "Bright electric accents" },
  { key: "soft", label: "Soft", description: "Muted, comfortable colors" }
];

export const accentOptions: AccentOption[] = [
  { key: "sky", group: "basic", label: "Sky", color: "#0284c7", soft: "#e0f2fe" },
  { key: "orange", group: "basic", label: "Orange", color: "#ea580c", soft: "#ffedd5" },
  { key: "amber", group: "basic", label: "Amber", color: "#d97706", soft: "#fef3c7" },
  { key: "emerald", group: "basic", label: "Emerald", color: "#059669", soft: "#d1fae5" },
  { key: "teal", group: "basic", label: "Teal", color: "#0d9488", soft: "#ccfbf1" },
  { key: "slate", group: "basic", label: "Slate", color: "#475569", soft: "#e2e8f0" },
  { key: "indigo", group: "jewel", label: "Indigo", color: "#4f46e5", soft: "#e0e7ff" },
  { key: "violet", group: "jewel", label: "Violet", color: "#7c3aed", soft: "#ede9fe" },
  { key: "fuchsia", group: "jewel", label: "Fuchsia", color: "#c026d3", soft: "#fae8ff" },
  { key: "rose", group: "jewel", label: "Rose", color: "#e11d48", soft: "#ffe4e6" },
  { key: "blue", group: "neon", label: "Neon Blue", color: "#1d4ed8", glow: "#3b82f6", soft: "#dbeafe" },
  { key: "red", group: "neon", label: "Neon Red", color: "#b91c1c", glow: "#ff3131", soft: "#fee2e2" },
  { key: "cyan", group: "neon", label: "Electric Cyan", color: "#0e7490", glow: "#22d3ee", soft: "#cffafe" },
  { key: "lime", group: "neon", label: "Acid Lime", color: "#4d7c0f", glow: "#a3e635", soft: "#ecfccb" },
  { key: "neon", group: "neon", label: "Neon Mint", color: "#008f7a", glow: "#00f5d4", soft: "#ccfbf1" },
  { key: "neonGreen", group: "neon", label: "Neon Green", color: "#166534", glow: "#22c55e", soft: "#dcfce7" },
  { key: "neonPink", group: "neon", label: "Laser Pink", color: "#be185d", glow: "#ff4ecd", soft: "#fce7f3" },
  { key: "neonPurple", group: "neon", label: "Volt Purple", color: "#7e22ce", glow: "#c084fc", soft: "#f3e8ff" },
  { key: "powder", group: "soft", label: "Powder Blue", color: "#3978b8", soft: "#dbeafe" },
  { key: "lavender", group: "soft", label: "Lavender", color: "#7c63b8", soft: "#ede9fe" },
  { key: "blush", group: "soft", label: "Blush", color: "#c6536b", soft: "#ffe4e6" },
  { key: "sage", group: "soft", label: "Sage", color: "#4f8067", soft: "#dcfce7" }
];

type ThemeContextValue = {
  mode: ThemeMode;
  accent: AccentKey;
  setAccent: (accent: AccentKey) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const modeKey = "sdr-theme-mode";
const accentKey = "sdr-accent-color";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => (localStorage.getItem(modeKey) === "dark" ? "dark" : "light"));
  const [accent, setAccentState] = useState<AccentKey>(() => {
    const saved = localStorage.getItem(accentKey) as AccentKey | null;
    return accentOptions.some((option) => option.key === saved) ? saved! : "sky";
  });

  useEffect(() => {
    localStorage.setItem(modeKey, mode);
    document.documentElement.dataset.theme = mode;
    const logoUrl = mode === "dark" ? "/sdr-logo-dark-v2.png" : "/sdr-logo-light-v2.png";
    document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-icon"]').forEach((link) => {
      link.href = logoUrl;
    });
  }, [mode]);

  useEffect(() => {
    const option = accentOptions.find((item) => item.key === accent) ?? accentOptions[0];
    localStorage.setItem(accentKey, accent);
    document.documentElement.style.setProperty("--accent", option.color);
    document.documentElement.style.setProperty("--accent-soft", option.soft);
    document.documentElement.style.setProperty("--accent-glow", option.glow ?? option.color);
    document.documentElement.style.setProperty("--accent-contrast", option.foreground ?? "#ffffff");
  }, [accent]);

  const value = useMemo(
    () => ({
      mode,
      accent,
      setAccent: setAccentState,
      toggleMode: () => setMode((current) => (current === "light" ? "dark" : "light"))
    }),
    [accent, mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
