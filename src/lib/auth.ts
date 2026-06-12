import studentsData from "@/data/students.json";

export type Subject = {
  code: string;
  name: string;
  credits: number;
  grade: string;
};

export type Semester = {
  number: number;
  sgpa: number;
  credits: number;
  subjects: Subject[];
};

export type StudentProfile = {
  name: string;
  usn: string;
  branch: string;
  currentSemester: number;
};

export type Student = {
  profile: StudentProfile;
  semesters: Semester[];
};

export type SessionRef = { name: string; usn: string };

const SESSION_KEY = "gradevault_session";

export const STUDENTS = studentsData as Student[];

export function findStudent(name: string, usn: string): Student | null {
  const n = name.trim().toLowerCase();
  const u = usn.trim().toUpperCase();
  return (
    STUDENTS.find(
      (s) =>
        s.profile.name.toLowerCase() === n &&
        s.profile.usn.toUpperCase() === u,
    ) ?? null
  );
}

export function findStudentByUsn(usn: string): Student | null {
  const u = usn.trim().toUpperCase();
  return STUDENTS.find((s) => s.profile.usn.toUpperCase() === u) ?? null;
}

export function saveSession(student: Student) {
  if (typeof window === "undefined") return;
  const ref: SessionRef = {
    name: student.profile.name,
    usn: student.profile.usn,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(ref));
}

export function getSession(): SessionRef | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionRef;
  } catch {
    return null;
  }
}

export function getCurrentStudent(): Student | null {
  const session = getSession();
  if (!session) return null;
  return findStudentByUsn(session.usn);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export const DEMO_ACCOUNT_USN = "1RN24CS001";

export function getDemoStudent(): Student {
  return findStudentByUsn(DEMO_ACCOUNT_USN)!;
}

// Backwards-compat constant used by login page
export const DEMO_ACCOUNT = {
  name: "Demo Student",
  usn: DEMO_ACCOUNT_USN,
};

// ===== Academic helpers =====

export function computeCGPA(semesters: Semester[]): number {
  if (semesters.length === 0) return 0;
  const totalCredits = semesters.reduce((s, x) => s + x.credits, 0);
  if (totalCredits === 0) return 0;
  const weighted = semesters.reduce((s, x) => s + x.sgpa * x.credits, 0);
  return weighted / totalCredits;
}

export function totalCredits(semesters: Semester[]): number {
  return semesters.reduce((s, x) => s + x.credits, 0);
}

export function latestSGPA(semesters: Semester[]): number {
  if (semesters.length === 0) return 0;
  return [...semesters].sort((a, b) => b.number - a.number)[0].sgpa;
}

export function cgpaToPercentage(cgpa: number): number {
  return (cgpa - 0.75) * 10;
}

export function academicStatus(cgpa: number): {
  label: string;
  tone: "excellent" | "good" | "average" | "low";
} {
  if (cgpa >= 8.5) return { label: "Excellent", tone: "excellent" };
  if (cgpa >= 8.0) return { label: "Good", tone: "good" };
  if (cgpa >= 7.0) return { label: "Average", tone: "average" };
  return { label: "Needs Improvement", tone: "low" };
}
