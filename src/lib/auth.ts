import students from "@/data/students.json";

export type Student = { name: string; usn: string };

const SESSION_KEY = "gradevault_session";

export function findStudent(name: string, usn: string): Student | null {
  const n = name.trim().toLowerCase();
  const u = usn.trim().toUpperCase();
  return (
    (students as Student[]).find(
      (s) => s.name.toLowerCase() === n && s.usn.toUpperCase() === u,
    ) ?? null
  );
}

export function saveSession(student: Student) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(student));
}

export function getSession(): Student | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Student;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export const DEMO_ACCOUNT: Student = {
  name: "Demo Student",
  usn: "1RN24CS001",
};
