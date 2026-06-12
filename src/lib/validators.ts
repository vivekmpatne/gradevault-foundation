/**
 * Shared field validators used across forms and store mutators.
 * Keeps a single source of truth for "what is a valid mark / credit /
 * positive integer" so the calculator, settings, coding hub and
 * placement tracker can't drift.
 */

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function clampInt(
  raw: number | string,
  min: number,
  max: number,
  fallback: number = min,
): number {
  const n =
    typeof raw === "number" ? Math.floor(raw) : parseInt(String(raw), 10);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

export function clampNumber(
  raw: number | string,
  min: number,
  max: number,
  fallback: number = min,
): number {
  const n = typeof raw === "number" ? raw : parseFloat(String(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function positiveInt(raw: number | string, max = 100_000): number {
  return clampInt(raw, 0, max, 0);
}

// Academic --------------------------------------------------------------

export const MARKS_MIN = 0;
export const MARKS_MAX = 100;
export const CREDIT_MIN = 1;
export const CREDIT_MAX = 4;
export const SEMESTER_MIN = 1;
export const SEMESTER_MAX = 8;

export function validateMarks(raw: number | string): ValidationResult<number> {
  const n = typeof raw === "number" ? raw : parseFloat(String(raw));
  if (!Number.isFinite(n)) return { ok: false, error: "Marks must be a number" };
  if (n < MARKS_MIN || n > MARKS_MAX)
    return { ok: false, error: `Marks must be ${MARKS_MIN}–${MARKS_MAX}` };
  return { ok: true, value: Math.round(n) };
}

export function validateCredits(raw: number | string): ValidationResult<number> {
  const n = clampInt(raw, CREDIT_MIN, CREDIT_MAX, 0);
  if (n < CREDIT_MIN || n > CREDIT_MAX)
    return { ok: false, error: `Credits must be ${CREDIT_MIN}–${CREDIT_MAX}` };
  return { ok: true, value: n };
}

export function validateSemesterNumber(raw: number | string): ValidationResult<number> {
  const n = clampInt(raw, SEMESTER_MIN, SEMESTER_MAX, 0);
  if (n < SEMESTER_MIN || n > SEMESTER_MAX)
    return { ok: false, error: `Semester must be ${SEMESTER_MIN}–${SEMESTER_MAX}` };
  return { ok: true, value: n };
}

// Coding profile --------------------------------------------------------

export const LIMITS = {
  leetcodeRating: { min: 0, max: 4000 },
  codeforcesRating: { min: 0, max: 4500 },
  contestCount: { min: 0, max: 2000 },
  problems: { min: 0, max: 10_000 },
  streakDays: { min: 0, max: 3650 },
  projects: { min: 0, max: 200 },
  repos: { min: 0, max: 2000 },
  oss: { min: 0, max: 2000 },
  activeDays: { min: 0, max: 3650 },
  targetCgpa: { min: 0, max: 10 },
} as const;

// Strings ---------------------------------------------------------------

const USERNAME_RE = /^[A-Za-z0-9_\-.]{1,40}$/;

export function sanitizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").slice(0, 40);
}

export function validateUsername(raw: string): ValidationResult<string> {
  const v = sanitizeUsername(raw);
  if (!v) return { ok: true, value: "" }; // empty = cleared, allowed
  if (!USERNAME_RE.test(v))
    return {
      ok: false,
      error: "Use letters, numbers, _, -, .",
    };
  return { ok: true, value: v };
}

export function safeUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  try {
    const url = new URL(v);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

// Dedupe helpers --------------------------------------------------------

export function applicationFingerprint(input: {
  company: string;
  role: string;
  applicationDate: string;
}): string {
  return [
    input.company.trim().toLowerCase(),
    input.role.trim().toLowerCase(),
    input.applicationDate,
  ].join("|");
}

export function feedbackFingerprint(input: {
  category: string;
  comment: string;
  authorUsn: string;
}): string {
  return [
    input.category,
    input.authorUsn,
    input.comment.trim().toLowerCase().slice(0, 200),
  ].join("|");
}
