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
  university?: string;
  college?: string;
  graduationYear?: number;
};

export type Student = {
  profile: StudentProfile;
  semesters: Semester[];
  source?: "seed" | "local";
  id?: string;
  createdAt?: number;
};

export type SessionRef = { name: string; usn: string };

const SESSION_KEY = "gradevault_session";
const LOCAL_STUDENTS_KEY = "gradevault_students";
export const STUDENTS_EVENT = "gradevault:students-changed";

export const SEED_STUDENTS: Student[] = (studentsData as Student[]).map((s) => ({
  ...s,
  source: "seed",
}));

// Back-compat alias
export const STUDENTS = SEED_STUDENTS;

function emitStudentsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STUDENTS_EVENT));
}

export function loadLocalStudents(): Student[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_STUDENTS_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as Student[];
    return arr.map((s) => ({ ...s, source: "local" }));
  } catch {
    return [];
  }
}

function saveLocalStudents(list: Student[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    LOCAL_STUDENTS_KEY,
    JSON.stringify(list.map(({ source: _s, ...rest }) => rest)),
  );
  emitStudentsChanged();
}

export function listAllStudents(): Student[] {
  return [...SEED_STUDENTS, ...loadLocalStudents()];
}

export function findStudent(name: string, usn: string): Student | null {
  const n = name.trim().toLowerCase();
  const u = usn.trim().toUpperCase();
  return (
    listAllStudents().find(
      (s) =>
        s.profile.name.toLowerCase() === n &&
        s.profile.usn.toUpperCase() === u,
    ) ?? null
  );
}

export function findStudentByUsn(usn: string): Student | null {
  const u = usn.trim().toUpperCase();
  return listAllStudents().find((s) => s.profile.usn.toUpperCase() === u) ?? null;
}

export type NewStudentInput = {
  name: string;
  usn: string;
  branch: string;
  currentSemester: number;
  university?: string;
  college?: string;
  graduationYear?: number;
};

export function createLocalStudent(input: NewStudentInput): {
  ok: boolean;
  error?: string;
  student?: Student;
} {
  const name = input.name.trim();
  const usn = input.usn.trim().toUpperCase();
  const branch = input.branch.trim();
  const sem = Number(input.currentSemester);

  if (!name) return { ok: false, error: "Name is required." };
  if (!usn) return { ok: false, error: "USN is required." };
  if (!branch) return { ok: false, error: "Branch is required." };
  if (!Number.isFinite(sem) || sem < 1 || sem > 8) {
    return { ok: false, error: "Semester must be between 1 and 8." };
  }
  if (findStudentByUsn(usn)) {
    return { ok: false, error: "An account with this USN already exists." };
  }

  const student: Student = {
    id: `local_${Date.now().toString(36)}`,
    createdAt: Date.now(),
    source: "local",
    profile: {
      name,
      usn,
      branch,
      currentSemester: sem,
      university: input.university?.trim() || "VTU",
      college: input.college?.trim() || "",
      graduationYear: input.graduationYear || undefined,
    },
    semesters: [],
  };

  const list = loadLocalStudents();
  list.push(student);
  saveLocalStudents(list);
  return { ok: true, student };
}

export function updateLocalStudent(
  usn: string,
  patch: Partial<NewStudentInput>,
): { ok: boolean; error?: string; student?: Student } {
  const list = loadLocalStudents();
  const idx = list.findIndex(
    (s) => s.profile.usn.toUpperCase() === usn.toUpperCase(),
  );
  if (idx === -1) {
    return {
      ok: false,
      error: "Demo accounts cannot be edited.",
    };
  }
  const current = list[idx];
  const next: Student = {
    ...current,
    profile: {
      ...current.profile,
      name: patch.name?.trim() || current.profile.name,
      branch: patch.branch?.trim() || current.profile.branch,
      currentSemester:
        patch.currentSemester !== undefined
          ? Number(patch.currentSemester)
          : current.profile.currentSemester,
      college:
        patch.college !== undefined ? patch.college.trim() : current.profile.college,
      university:
        patch.university !== undefined
          ? patch.university.trim()
          : current.profile.university,
      graduationYear:
        patch.graduationYear !== undefined
          ? patch.graduationYear || undefined
          : current.profile.graduationYear,
    },
  };
  if (
    next.profile.currentSemester < 1 ||
    next.profile.currentSemester > 8
  ) {
    return { ok: false, error: "Semester must be between 1 and 8." };
  }
  list[idx] = next;
  saveLocalStudents(list);
  return { ok: true, student: next };
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

export function isLocalStudent(usn: string): boolean {
  return loadLocalStudents().some(
    (s) => s.profile.usn.toUpperCase() === usn.toUpperCase(),
  );
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export const DEMO_ACCOUNT_USN = "1RN24CS001";

export function getDemoStudent(): Student {
  return findStudentByUsn(DEMO_ACCOUNT_USN)!;
}

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
