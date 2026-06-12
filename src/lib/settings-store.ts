import { useCallback, useEffect, useState } from "react";
import { getSession } from "@/lib/auth";

export type PrepTrack = "on-campus" | "off-campus" | "higher-studies";
export type ThemeMode = "light" | "dark";

export type StudentSettings = {
  prepTrack: PrepTrack;
  careerGoal: string;
  targetCGPA: number;
  targetLPA: number;
  targetGATE: number;
  leetcode: number;
  codeforces: number;
  projects: number;
  github: string;
  linkedin: string;
  // Coding Profile Hub
  codolioUrl: string;
  githubUsername: string;
  leetcodeUsername: string;
  codeforcesHandle: string;
  totalProblemsSolved: number;
  contestCount: number;
  currentStreak: number;
  githubRepos: number;
  openSourceContributions: number;
  activeDevDays: number;
};

export const DEFAULT_SETTINGS: StudentSettings = {
  prepTrack: "on-campus",
  careerGoal: "",
  targetCGPA: 9,
  targetLPA: 12,
  targetGATE: 750,
  leetcode: 0,
  codeforces: 0,
  projects: 0,
  github: "",
  linkedin: "",
  codolioUrl: "",
  githubUsername: "",
  leetcodeUsername: "",
  codeforcesHandle: "",
  totalProblemsSolved: 0,
  contestCount: 0,
  currentStreak: 0,
  githubRepos: 0,
  openSourceContributions: 0,
  activeDevDays: 0,
};

const SETTINGS_PREFIX = "gradevault_settings_";
const THEME_KEY = "gradevault_theme";
export const SETTINGS_EVENT = "gradevault:settings-changed";

function settingsKey(usn: string) {
  return `${SETTINGS_PREFIX}${usn.toUpperCase()}`;
}

export function loadSettings(): StudentSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const session = getSession();
  if (!session) return DEFAULT_SETTINGS;
  const raw = localStorage.getItem(settingsKey(session.usn));
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as StudentSettings) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: StudentSettings) {
  if (typeof window === "undefined") return;
  const session = getSession();
  if (!session) return;
  localStorage.setItem(settingsKey(session.usn), JSON.stringify(s));
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function loadTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const v = localStorage.getItem(THEME_KEY);
  return v === "dark" ? "dark" : "light";
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
}

export function setTheme(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode);
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function useSettings() {
  const [settings, setSettingsState] = useState<StudentSettings>(() =>
    loadSettings(),
  );
  const [theme, setThemeState] = useState<ThemeMode>(() => loadTheme());

  const refresh = useCallback(() => {
    setSettingsState(loadSettings());
    setThemeState(loadTheme());
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(SETTINGS_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  return { settings, theme };
}
