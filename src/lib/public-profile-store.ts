/**
 * Public profile snapshot store (Phase 2 — slim).
 *
 * Stores a read-only snapshot of the student's Career OS card in
 * localStorage under a username handle. Future versions will sync this
 * to Lovable Cloud so /u/$username is shareable across devices; for now
 * the link works on the same browser and demonstrates the architecture.
 */
import type { AcademicData } from "@/lib/academic-store";
import type { StudentSettings } from "@/lib/settings-store";

const KEY_PREFIX = "gradevault_public_profile:";
const INDEX_KEY = "gradevault_public_profile_index";

export type PublicProfileSnapshot = {
  version: 1;
  updatedAt: number;
  username: string;
  displayName: string;
  branch?: string;
  college?: string;
  currentSemester: number;
  cgpa: number;
  latestSgpa: number;
  totalCredits: number;
  completedSemesters: number;
  coding: {
    leetcodeUsername?: string;
    codeforcesHandle?: string;
    githubUsername?: string;
    leetcodeSolved?: number;
    codeforcesRating?: number;
    githubRepos?: number;
  };
  links: {
    linkedin?: string;
    codolio?: string;
  };
  goals: {
    careerGoal?: string;
    targetCGPA?: number;
  };
  projects: number;
};

export function usernameFromUsn(usn: string): string {
  return usn.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function buildSnapshot(
  academic: AcademicData,
  settings: StudentSettings,
): PublicProfileSnapshot | null {
  const student = academic.student;
  if (!student) return null;
  const username = usernameFromUsn(student.profile.usn);
  if (!username) return null;
  return {
    version: 1,
    updatedAt: Date.now(),
    username,
    displayName: student.profile.name,
    branch: student.profile.branch,
    college: student.profile.college,
    currentSemester: academic.currentSemester,
    cgpa: Number(academic.cgpa.toFixed(2)),
    latestSgpa: Number(academic.latestSgpa.toFixed(2)),
    totalCredits: academic.totalCredits,
    completedSemesters: academic.completedSemesters,
    coding: {
      leetcodeUsername: settings.leetcodeUsername || undefined,
      codeforcesHandle: settings.codeforcesHandle || undefined,
      githubUsername: settings.githubUsername || undefined,
      leetcodeSolved: settings.leetcode || undefined,
      codeforcesRating: settings.codeforces || undefined,
      githubRepos: settings.githubRepos || undefined,
    },
    links: {
      linkedin: settings.linkedin || undefined,
      codolio: settings.codolioUrl || undefined,
    },
    goals: {
      careerGoal: settings.careerGoal || undefined,
      targetCGPA: settings.targetCGPA || undefined,
    },
    projects: settings.projects || 0,
  };
}

function readIndex(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(list: string[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(Array.from(new Set(list))));
}

export function publishSnapshot(snap: PublicProfileSnapshot): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_PREFIX + snap.username, JSON.stringify(snap));
  writeIndex([...readIndex(), snap.username]);
}

export function unpublishSnapshot(username: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_PREFIX + username);
  writeIndex(readIndex().filter((u) => u !== username));
}

export function loadSnapshot(username: string): PublicProfileSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY_PREFIX + username.toLowerCase());
    return raw ? (JSON.parse(raw) as PublicProfileSnapshot) : null;
  } catch {
    return null;
  }
}

export function isPublished(username: string): boolean {
  return !!loadSnapshot(username);
}

export function shareUrl(username: string): string {
  if (typeof window === "undefined") return `/u/${username}`;
  return `${window.location.origin}/u/${username}`;
}
