/**
 * Public profile snapshot — client-side helpers.
 *
 * The snapshot itself is stored in Cloud (`profile_snapshots`) via server
 * functions. This module owns:
 *  - building a snapshot from current academic + settings state
 *  - per-username claim tokens stored in localStorage so the original
 *    publisher (and only they) can update or unpublish from this browser
 */
import type { AcademicData } from "@/lib/academic-store";
import type { StudentSettings } from "@/lib/settings-store";
import type { PublicSnapshot } from "@/lib/public-profile.functions";

export type PublicProfileSnapshot = PublicSnapshot;

const CLAIM_PREFIX = "gradevault_profile_claim:";

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

function randomToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${crypto.randomUUID()}${crypto.randomUUID().replace(/-/g, "")}`.slice(
      0,
      64,
    );
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36).repeat(3);
}

export function getOrCreateClaimToken(username: string): string {
  if (typeof window === "undefined") return "";
  const key = CLAIM_PREFIX + username;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const token = randomToken();
  localStorage.setItem(key, token);
  return token;
}

export function getClaimToken(username: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CLAIM_PREFIX + username);
}

export function clearClaimToken(username: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CLAIM_PREFIX + username);
}

export function shareUrl(username: string): string {
  if (typeof window === "undefined") return `/u/${username}`;
  return `${window.location.origin}/u/${username}`;
}
