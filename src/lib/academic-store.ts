import { useEffect, useState, useCallback } from "react";
import {
  getCurrentStudent,
  getSession,
  type Student,
} from "@/lib/auth";
import {
  gradePointFromMarks,
  loadAllSemesters,
  type CalcSemester,
  type CalcSubject,
} from "@/lib/calculator-storage";

const KEY_PREFIX = "gradevault_calc_";
export const ACADEMIC_EVENT = "gradevault:academic-changed";

export type AcademicSemester = {
  number: number;
  sgpa: number;
  credits: number;
  subjects: CalcSubject[];
  source: "saved" | "seed";
  completed: boolean;
};

export type AcademicData = {
  student: Student | null;
  semesters: AcademicSemester[];
  completedSemesters: number;
  currentSemester: number;
  latestSemesterNumber: number;
  cgpa: number;
  latestSgpa: number;
  totalCredits: number;
  percentage: number;
  status: { label: string; tone: "excellent" | "good" | "average" | "low" };
  hasData: boolean;
};

function isSemesterCompleted(subjects: CalcSubject[]): boolean {
  if (subjects.length === 0) return false;
  return subjects.every((s) => (s.marks ?? 0) > 0 && (s.credits ?? 0) > 0);
}

function sgpaFromSubjects(subjects: CalcSubject[]): {
  sgpa: number;
  credits: number;
} {
  const credits = subjects.reduce((a, s) => a + (s.credits || 0), 0);
  const cp = subjects.reduce(
    (a, s) => a + (s.credits || 0) * gradePointFromMarks(s.marks || 0),
    0,
  );
  return { sgpa: credits > 0 ? cp / credits : 0, credits };
}

function approxMarksFromGrade(grade: string): number {
  const g = grade.trim().toUpperCase();
  if (g === "O") return 95;
  if (g === "A+") return 85;
  if (g === "A") return 75;
  if (g === "B+") return 65;
  if (g === "B") return 55;
  if (g === "C") return 45;
  return 0;
}

function seedSubjects(
  student: Student,
  num: number,
): CalcSubject[] {
  const bundled = student.semesters.find((s) => s.number === num);
  if (!bundled) return [];
  return bundled.subjects.map((sub, i) => ({
    id: `seed_${student.profile.usn}_${num}_${i}`,
    name: sub.name,
    credits: sub.credits,
    marks: approxMarksFromGrade(sub.grade),
  }));
}

export function computeAcademicData(): AcademicData {
  const student = getCurrentStudent();
  if (!student) {
    return {
      student: null,
      semesters: [],
      completedSemesters: 0,
      currentSemester: 1,
      latestSemesterNumber: 0,
      cgpa: 0,
      latestSgpa: 0,
      totalCredits: 0,
      percentage: 0,
      status: { label: "—", tone: "low" },
      hasData: false,
    };
  }

  const saved = loadAllSemesters();
  const numbers = new Set<number>();
  Object.keys(saved).forEach((k) => numbers.add(Number(k)));
  student.semesters.forEach((s) => numbers.add(s.number));

  const semesters: AcademicSemester[] = [...numbers]
    .sort((a, b) => a - b)
    .map((num) => {
      const s = saved[num];
      if (s) {
        const { sgpa, credits } = sgpaFromSubjects(s.subjects);
        return {
          number: num,
          sgpa,
          credits,
          subjects: s.subjects,
          source: "saved" as const,
          completed: isSemesterCompleted(s.subjects),
        };
      }
      const subs = seedSubjects(student, num);
      const { sgpa, credits } = sgpaFromSubjects(subs);
      const bundled = student.semesters.find((x) => x.number === num)!;
      return {
        number: num,
        sgpa: credits > 0 ? sgpa : bundled.sgpa,
        credits: credits > 0 ? credits : bundled.credits,
        subjects: subs,
        source: "seed" as const,
        // Seed data from the bundled JSON represents historical, finished terms.
        completed: true,
      };
    });

  const completedList = semesters.filter((s) => s.completed);
  const completedSemesters = completedList.length;
  const latestSemesterNumber =
    semesters.length > 0 ? semesters[semesters.length - 1].number : 0;
  const latest = semesters[semesters.length - 1];

  // Current Semester = highest semester number present in history.
  // Falls back to 1 when there is no history yet.
  const currentSemester =
    latestSemesterNumber > 0 ? latestSemesterNumber : 1;

  const totalCredits = completedList.reduce((a, s) => a + s.credits, 0);
  const weighted = completedList.reduce((a, s) => a + s.sgpa * s.credits, 0);
  const cgpa = totalCredits > 0 ? weighted / totalCredits : 0;
  const latestCompleted = completedList[completedList.length - 1];
  const latestSgpa = latestCompleted ? latestCompleted.sgpa : 0;
  const percentage = (cgpa - 0.75) * 10;
  const status = academicStatus(cgpa);

  return {
    student,
    semesters,
    completedSemesters,
    currentSemester,
    latestSemesterNumber,
    cgpa,
    latestSgpa,
    totalCredits,
    percentage,
    status,
    hasData: semesters.length > 0,
  };
}

function academicStatus(cgpa: number): AcademicData["status"] {
  if (cgpa >= 8.5) return { label: "Excellent", tone: "excellent" };
  if (cgpa >= 8.0) return { label: "Good", tone: "good" };
  if (cgpa >= 7.0) return { label: "Average", tone: "average" };
  return { label: "Needs Improvement", tone: "low" };
}

export function emitAcademicChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ACADEMIC_EVENT));
}

export function deleteSemester(num: number) {
  if (typeof window === "undefined") return;
  const session = getSession();
  if (!session) return;
  const key = `${KEY_PREFIX}${session.usn.toUpperCase()}`;
  const all = loadAllSemesters();
  delete all[num];
  localStorage.setItem(key, JSON.stringify(all));
  emitAcademicChange();
}

export function saveSemesterFromSubjects(
  num: number,
  subjects: CalcSubject[],
) {
  const session = getSession();
  if (!session) return;
  const key = `${KEY_PREFIX}${session.usn.toUpperCase()}`;
  const all = loadAllSemesters();
  const sem: CalcSemester = {
    number: num,
    subjects,
    updatedAt: Date.now(),
  };
  all[num] = sem;
  localStorage.setItem(key, JSON.stringify(all));
  emitAcademicChange();
}

export function useAcademicData(): AcademicData {
  const [data, setData] = useState<AcademicData>(() => computeAcademicData());

  const refresh = useCallback(() => {
    setData(computeAcademicData());
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith(KEY_PREFIX)) refresh();
    };
    window.addEventListener(ACADEMIC_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(ACADEMIC_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return data;
}
