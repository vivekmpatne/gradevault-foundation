/**
 * Centralized student store — single source of truth.
 *
 * Every tab (Dashboard, Calculator, History, Settings, Suggestions,
 * Placement, Placement Tracker, Readiness, Strategy, Coding Hub, Roadmap,
 * Upload Marks, Feedback) reads from `useStudent()` and writes through
 * `updateSettings()` / `updateProfile()`, so a change in one place
 * propagates everywhere via the underlying event bus.
 *
 * Backed by LocalStorage via the academic + settings + readiness +
 * placement-tracker stores.
 */
import { useMemo } from "react";
import { useAcademicData, type AcademicData } from "@/lib/academic-store";
import {
  loadSettings,
  saveSettings as persistSettings,
  useSettings,
  type StudentSettings,
  type ThemeMode,
} from "@/lib/settings-store";
import { useReadiness, type ReadinessInputs } from "@/lib/readiness-store";
import {
  useApplications,
  type Application,
} from "@/lib/placement-tracker-store";
import {
  getSession,
  saveSession,
  updateLocalStudent,
  type NewStudentInput,
} from "@/lib/auth";

export type ProfileCompletion = {
  total: number; // 0..100
  breakdown: {
    basicInfo: number; // /30
    academic: number; // /20
    coding: number; // /20
    goals: number; // /15
    projects: number; // /15
  };
  missing: string[];
};

function computeProfileCompletion(
  academic: AcademicData,
  settings: StudentSettings,
): ProfileCompletion {
  const missing: string[] = [];

  // Basic info — 30 pts
  const p = academic.student?.profile;
  let basicInfo = 0;
  if (p?.name) basicInfo += 6; else missing.push("Full name");
  if (p?.usn) basicInfo += 6; else missing.push("USN");
  if (p?.branch) basicInfo += 6; else missing.push("Branch");
  if (p?.currentSemester) basicInfo += 6; else missing.push("Current semester");
  if (p?.college) basicInfo += 3; else missing.push("College");
  if (p?.graduationYear) basicInfo += 3; else missing.push("Graduation year");

  // Academic — 20 pts
  let academicScore = 0;
  if (academic.completedSemesters >= 1) academicScore += 10;
  if (academic.completedSemesters >= 3) academicScore += 5;
  if (academic.totalCredits >= 40) academicScore += 5;
  if (academic.completedSemesters === 0)
    missing.push("Add at least one semester");

  // Coding profiles — 20 pts
  let coding = 0;
  if (settings.githubUsername) coding += 5; else missing.push("GitHub username");
  if (settings.leetcodeUsername) coding += 5; else missing.push("LeetCode username");
  if (settings.codeforcesHandle) coding += 5; else missing.push("Codeforces handle");
  if (settings.linkedin || settings.codolioUrl) coding += 5;
  else missing.push("LinkedIn or Codolio URL");

  // Career goals — 15 pts
  let goals = 0;
  if (settings.targetCGPA > 0) goals += 5;
  if (settings.careerGoal) goals += 5; else missing.push("Career goal");
  if (settings.prepTrack) goals += 5;

  // Projects — 15 pts
  let projects = 0;
  if (settings.projects >= 1) projects += 5;
  if (settings.projects >= 3) projects += 5;
  if (settings.projects >= 5) projects += 5;
  if (settings.projects < 3)
    missing.push(`${3 - settings.projects} more project${3 - settings.projects === 1 ? "" : "s"}`);

  const total = Math.min(
    100,
    basicInfo + academicScore + coding + goals + projects,
  );

  return {
    total,
    breakdown: { basicInfo, academic: academicScore, coding, goals, projects },
    missing,
  };
}

export type StudentStore = {
  academic: AcademicData;
  settings: StudentSettings;
  theme: ThemeMode;
  readiness: ReadinessInputs;
  applications: Application[];
  applicationsCount: number;
  profileCompletion: ProfileCompletion;
};

export function useStudent(): StudentStore {
  const academic = useAcademicData();
  const { settings, theme } = useSettings();
  const [readiness] = useReadiness();
  const applications = useApplications();

  const profileCompletion = useMemo(
    () => computeProfileCompletion(academic, settings),
    [academic, settings],
  );

  return {
    academic,
    settings,
    theme,
    readiness,
    applications,
    applicationsCount: applications.length,
    profileCompletion,
  };
}

// ----- Unified write helpers -----

/** Patch any subset of settings; fires SETTINGS_EVENT so every consumer
 *  re-renders without a reload. */
export function updateSettings(patch: Partial<StudentSettings>): void {
  persistSettings({ ...loadSettings(), ...patch });
}

/** Patch the local student profile (name, branch, semester, college, …).
 *  Demo (seed) accounts return `{ ok: false }`. */
export function updateProfile(
  patch: Partial<NewStudentInput>,
): { ok: boolean; error?: string } {
  const session = getSession();
  if (!session) return { ok: false, error: "Not signed in" };
  const res = updateLocalStudent(session.usn, patch);
  if (res.ok && res.student) {
    // Keep session ref in sync (name may have changed).
    saveSession(res.student);
  }
  return { ok: res.ok, error: res.error };
}

// Re-exports so consumers only need this one module.
export { useAcademicData } from "@/lib/academic-store";
export {
  useSettings,
  setTheme,
  loadSettings,
  loadTheme,
  applyTheme,
  DEFAULT_SETTINGS,
} from "@/lib/settings-store";
export { useApplications } from "@/lib/placement-tracker-store";
export type { AcademicData } from "@/lib/academic-store";
export type {
  StudentSettings,
  PrepTrack,
  ThemeMode,
} from "@/lib/settings-store";

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
