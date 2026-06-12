/**
 * Centralized student store.
 *
 * Single source of truth for every tab (Dashboard, Calculator, History,
 * Settings, Suggestions, Placement, Roadmap, and future tabs).
 *
 * Backed by LocalStorage via the underlying academic + settings stores.
 * All mutations dispatch events so every consumer re-renders instantly.
 */
import { useAcademicData, type AcademicData } from "@/lib/academic-store";
import {
  useSettings,
  type StudentSettings,
  type ThemeMode,
} from "@/lib/settings-store";

export type StudentStore = {
  academic: AcademicData;
  settings: StudentSettings;
  theme: ThemeMode;
};

export function useStudent(): StudentStore {
  const academic = useAcademicData();
  const { settings, theme } = useSettings();
  return { academic, settings, theme };
}

// Re-exports so consumers only need this one module.
export { useAcademicData } from "@/lib/academic-store";
export {
  useSettings,
  saveSettings,
  setTheme,
  loadSettings,
  loadTheme,
  applyTheme,
  DEFAULT_SETTINGS,
} from "@/lib/settings-store";
export type { AcademicData } from "@/lib/academic-store";
export type {
  StudentSettings,
  PrepTrack,
  ThemeMode,
} from "@/lib/settings-store";
