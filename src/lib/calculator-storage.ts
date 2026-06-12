import { getSession } from "@/lib/auth";

export type CalcSubject = {
  id: string;
  name: string;
  credits: number;
  marks: number;
};

export type CalcSemester = {
  number: number;
  subjects: CalcSubject[];
  updatedAt: number;
};

const KEY_PREFIX = "gradevault_calc_";

function key(usn: string) {
  return `${KEY_PREFIX}${usn.toUpperCase()}`;
}

export function loadAllSemesters(): Record<number, CalcSemester> {
  if (typeof window === "undefined") return {};
  const session = getSession();
  if (!session) return {};
  const raw = localStorage.getItem(key(session.usn));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<number, CalcSemester>;
  } catch {
    return {};
  }
}

export function saveSemester(sem: CalcSemester) {
  const session = getSession();
  if (!session) return;
  const all = loadAllSemesters();
  all[sem.number] = { ...sem, updatedAt: Date.now() };
  localStorage.setItem(key(session.usn), JSON.stringify(all));
}

export function gradePointFromMarks(marks: number): number {
  if (marks >= 90) return 10;
  if (marks >= 80) return 9;
  if (marks >= 70) return 8;
  if (marks >= 60) return 7;
  if (marks >= 50) return 6;
  if (marks >= 40) return 5;
  return 0;
}

export function newSubject(): CalcSubject {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Math.random().toString(36).slice(2)}`,
    name: "",
    credits: 3,
    marks: 0,
  };
}
