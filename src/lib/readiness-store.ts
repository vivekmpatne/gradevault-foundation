/**
 * Placement Readiness store — persists user inputs that aren't covered by
 * settings (project quality, resume checklist). Combined with academic
 * CGPA + settings (LeetCode / Codeforces / project count) to compute a
 * 100-point readiness score.
 */
import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";

export type ProjectQuality = "basic" | "intermediate" | "advanced";

export type ReadinessInputs = {
  projectQuality: ProjectQuality;
  atsResume: boolean;
  githubUpdated: boolean;
  linkedinUpdated: boolean;
  resumeReviewed: boolean;
};

export const DEFAULT_READINESS: ReadinessInputs = {
  projectQuality: "basic",
  atsResume: false,
  githubUpdated: false,
  linkedinUpdated: false,
  resumeReviewed: false,
};

const KEY_PREFIX = "gradevault_readiness:";
const EVENT = "gradevault:readiness-changed";

function keyFor(usn: string) {
  return `${KEY_PREFIX}${usn.toUpperCase()}`;
}

export function loadReadiness(): ReadinessInputs {
  if (typeof window === "undefined") return DEFAULT_READINESS;
  const s = getSession();
  if (!s) return DEFAULT_READINESS;
  try {
    const raw = localStorage.getItem(keyFor(s.usn));
    if (!raw) return DEFAULT_READINESS;
    return { ...DEFAULT_READINESS, ...(JSON.parse(raw) as ReadinessInputs) };
  } catch {
    return DEFAULT_READINESS;
  }
}

export function saveReadiness(v: ReadinessInputs) {
  const s = getSession();
  if (!s) return;
  localStorage.setItem(keyFor(s.usn), JSON.stringify(v));
  window.dispatchEvent(new Event(EVENT));
}

export function useReadiness(): [
  ReadinessInputs,
  (patch: Partial<ReadinessInputs>) => void,
] {
  const [state, setState] = useState<ReadinessInputs>(() => loadReadiness());
  useEffect(() => {
    const refresh = () => setState(loadReadiness());
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const update = (patch: Partial<ReadinessInputs>) => {
    const next = { ...loadReadiness(), ...patch };
    saveReadiness(next);
    setState(next);
  };
  return [state, update];
}

// ---------- Scoring ----------

export type ReadinessBreakdown = {
  academics: number; // /20
  dsa: number; // /40
  projects: number; // /25
  resume: number; // /15
  total: number; // /100
  dsaDetail: { leetcode: number; codeforces: number };
};

export function scoreAcademics(cgpa: number): number {
  if (cgpa >= 9.0) return 20;
  if (cgpa >= 8.5) return 18;
  if (cgpa >= 8.0) return 16;
  if (cgpa >= 7.5) return 12;
  return 8;
}

/** LeetCode: 0..2000+ rating maps to 0..25. Codeforces: 0..1800+ → 0..15. */
export function scoreDSA(leetcode: number, codeforces: number) {
  const lc = Math.min(25, Math.max(0, (leetcode / 2000) * 25));
  const cf = Math.min(15, Math.max(0, (codeforces / 1800) * 15));
  return {
    total: Math.round(lc + cf),
    leetcode: Math.round(lc),
    codeforces: Math.round(cf),
  };
}

/** Projects: count contributes up to 15, quality multiplier up to 10. */
export function scoreProjects(count: number, quality: ProjectQuality): number {
  const countPart = Math.min(15, (Math.max(0, count) / 5) * 15);
  const qualityPart =
    quality === "advanced" ? 10 : quality === "intermediate" ? 6 : 3;
  return Math.round(Math.min(25, countPart + qualityPart));
}

export function scoreResume(r: ReadinessInputs): number {
  // 4 checkboxes, weighted slightly toward ATS + review
  let s = 0;
  if (r.atsResume) s += 5;
  if (r.resumeReviewed) s += 4;
  if (r.githubUpdated) s += 3;
  if (r.linkedinUpdated) s += 3;
  return s; // max 15
}

export function computeReadiness(
  cgpa: number,
  leetcode: number,
  codeforces: number,
  projectCount: number,
  r: ReadinessInputs,
): ReadinessBreakdown {
  const academics = scoreAcademics(cgpa);
  const dsa = scoreDSA(leetcode, codeforces);
  const projects = scoreProjects(projectCount, r.projectQuality);
  const resume = scoreResume(r);
  return {
    academics,
    dsa: dsa.total,
    projects,
    resume,
    total: academics + dsa.total + projects + resume,
    dsaDetail: { leetcode: dsa.leetcode, codeforces: dsa.codeforces },
  };
}

export type ReadinessTier =
  | "Beginner"
  | "Developing"
  | "Interview Ready"
  | "Competitive"
  | "Top Candidate";

export function tierFor(total: number): ReadinessTier {
  if (total >= 90) return "Top Candidate";
  if (total >= 75) return "Competitive";
  if (total >= 60) return "Interview Ready";
  if (total >= 40) return "Developing";
  return "Beginner";
}

export function recommendations(
  cgpa: number,
  leetcode: number,
  codeforces: number,
  projectCount: number,
  b: ReadinessBreakdown,
  r: ReadinessInputs,
): string[] {
  const recs: string[] = [];
  if (b.dsa < 20)
    recs.push(
      `Focus on LeetCode and contests — current rating ${leetcode || 0}, target 1700+.`,
    );
  if (codeforces < 1200)
    recs.push(
      `Compete on Codeforces to push rating past 1200 (current: ${codeforces || 0}).`,
    );
  if (projectCount < 3)
    recs.push(
      `Build ${3 - projectCount} more resume-worthy project${3 - projectCount === 1 ? "" : "s"} to strengthen your portfolio.`,
    );
  if (r.projectQuality === "basic")
    recs.push("Upgrade at least one project to intermediate or advanced complexity (real users, deployed, polished).");
  if (cgpa >= 8.5 && b.dsa + b.projects < 40)
    recs.push("Academics are strong but projects and DSA are limiting progress — invest there next.");
  if (cgpa < 7.5)
    recs.push("Raise CGPA above 7.5 to clear most company eligibility cutoffs.");
  if (!r.atsResume) recs.push("Convert your resume to an ATS-friendly single-column format.");
  if (!r.resumeReviewed) recs.push("Get your resume reviewed by a senior or mentor.");
  if (!r.githubUpdated) recs.push("Update your GitHub: pinned repos, clean READMEs, recent commits.");
  if (!r.linkedinUpdated) recs.push("Refresh LinkedIn with current projects, skills, and a sharp headline.");
  if (recs.length === 0)
    recs.push("Strong profile across the board — keep mock interviews and system design on your radar.");
  return recs;
}
