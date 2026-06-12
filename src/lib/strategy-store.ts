/**
 * Career Strategy Advisor store + recommendation engine.
 * Pure functions — easy to unit-test or swap later.
 */
import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";

export type CollegeTier = "tier1" | "tier2" | "tier3";

export type StrategyInputs = {
  tier: CollegeTier;
  cgpa: number;
  dsaRating: number; // unified DSA rating (e.g. LeetCode contest)
  projects: number;
  internships: number;
};

export const DEFAULT_STRATEGY: StrategyInputs = {
  tier: "tier2",
  cgpa: 7.5,
  dsaRating: 1200,
  projects: 1,
  internships: 0,
};

const KEY_PREFIX = "gradevault_strategy:";
const EVENT = "gradevault:strategy-changed";

function keyFor(usn: string) {
  return `${KEY_PREFIX}${usn.toUpperCase()}`;
}

export function loadStrategy(): StrategyInputs {
  if (typeof window === "undefined") return DEFAULT_STRATEGY;
  const s = getSession();
  if (!s) return DEFAULT_STRATEGY;
  try {
    const raw = localStorage.getItem(keyFor(s.usn));
    if (!raw) return DEFAULT_STRATEGY;
    return { ...DEFAULT_STRATEGY, ...(JSON.parse(raw) as StrategyInputs) };
  } catch {
    return DEFAULT_STRATEGY;
  }
}

export function saveStrategy(v: StrategyInputs) {
  const s = getSession();
  if (!s) return;
  localStorage.setItem(keyFor(s.usn), JSON.stringify(v));
  window.dispatchEvent(new Event(EVENT));
}

export function useStrategyInputs(): [
  StrategyInputs,
  (patch: Partial<StrategyInputs>) => void,
] {
  const [state, setState] = useState<StrategyInputs>(() => loadStrategy());
  useEffect(() => {
    const refresh = () => setState(loadStrategy());
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const update = (patch: Partial<StrategyInputs>) => {
    const next = { ...loadStrategy(), ...patch };
    saveStrategy(next);
    setState(next);
  };
  return [state, update];
}

// ---------- Engine ----------

export type RecommendedPath = "on-campus" | "off-campus" | "hybrid";
export type RiskLevel = "low" | "medium" | "high";

export type StrategyReport = {
  path: RecommendedPath;
  pathLabel: string;
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
  actionPlan: { dsa: string; projects: string; resume: string; linkedin: string };
  risk: RiskLevel;
  riskReason: string;
  outcomes: string[];
};

const TIER_LABEL: Record<CollegeTier, string> = {
  tier1: "Tier 1",
  tier2: "Tier 2",
  tier3: "Tier 3",
};

export function buildReport(i: StrategyInputs): StrategyReport {
  const strongCgpa = i.cgpa >= 8.0;
  const okCgpa = i.cgpa >= 7.0;
  const strongDsa = i.dsaRating >= 1600;
  const okDsa = i.dsaRating >= 1200;
  const strongProjects = i.projects >= 3;
  const hasInternship = i.internships >= 1;

  // Path
  let path: RecommendedPath;
  if (i.tier === "tier1") {
    path = okDsa ? "on-campus" : "hybrid";
  } else if (i.tier === "tier2") {
    path = strongCgpa && okDsa ? "hybrid" : strongDsa ? "off-campus" : "on-campus";
  } else {
    // tier3
    path = strongDsa || strongProjects ? "off-campus" : "hybrid";
  }

  const pathLabel =
    path === "on-campus"
      ? "On-Campus Focus"
      : path === "off-campus"
        ? "Off-Campus Focus"
        : "Hybrid Strategy";

  // Reasoning
  const reasonBits: string[] = [];
  reasonBits.push(`${TIER_LABEL[i.tier]} college`);
  reasonBits.push(`CGPA ${i.cgpa.toFixed(2)}`);
  reasonBits.push(`DSA ${i.dsaRating}`);
  reasonBits.push(`${i.projects} project${i.projects === 1 ? "" : "s"}`);
  reasonBits.push(
    `${i.internships} internship${i.internships === 1 ? "" : "s"}`,
  );

  let reasoning: string;
  if (i.tier === "tier3" && strongDsa) {
    reasoning =
      "Off-campus can provide better opportunities than your campus pool because your DSA is competitive enough for product-company hiring bars.";
  } else if (i.tier === "tier3" && !okDsa) {
    reasoning =
      "Focus on strengthening fundamentals before aggressive applications — current DSA won't clear most online assessments.";
  } else if (i.tier === "tier2" && strongCgpa) {
    reasoning =
      "Maintain CGPA-based eligibility for service companies on-campus while building DSA + projects to attempt product roles off-campus.";
  } else if (i.tier === "tier1" && okDsa) {
    reasoning =
      "Your campus has strong recruiter inflow; prioritize on-campus drives while keeping a small off-campus pipeline as backup.";
  } else if (path === "hybrid") {
    reasoning =
      "Profile is balanced but not exceptional in any single axis — a hybrid path keeps the largest opportunity surface open.";
  } else {
    reasoning =
      "Recommendation is calibrated to where your profile currently has the highest conversion probability.";
  }
  reasoning += ` Profile snapshot: ${reasonBits.join(" · ")}.`;

  // Strengths / weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (strongCgpa) strengths.push("Strong CGPA clears most eligibility cutoffs");
  else if (!okCgpa) weaknesses.push("CGPA below 7.0 will block many shortlists");
  if (strongDsa) strengths.push("DSA rating is competitive for product companies");
  else if (!okDsa) weaknesses.push("DSA rating too low to clear standard OAs");
  if (strongProjects) strengths.push("Healthy project portfolio for resume screens");
  else if (i.projects <= 1) weaknesses.push("Project count is thin for off-campus applications");
  if (hasInternship) strengths.push("Internship experience adds credibility");
  else weaknesses.push("No internship yet — a strong differentiator on resumes");
  if (i.tier === "tier1") strengths.push("Tier 1 brand boosts recruiter response rate");
  if (i.tier === "tier3") weaknesses.push("Tier 3 brand → relies more on demonstrable skills");

  // Action plan (next 3 months)
  const actionPlan = {
    dsa: strongDsa
      ? `Maintain rating with weekly contests; rotate through hard graph/DP problems.`
      : okDsa
        ? `Solve 4-5 LeetCode problems/week + 1 contest. Target rating ${i.dsaRating + 200}+.`
        : `Daily problem habit (NeetCode 150). Reach 1200+ rating before applying widely.`,
    projects: strongProjects
      ? `Polish top 2 projects: deploy, write case-study READMEs, add demos.`
      : `Ship ${Math.max(1, 3 - i.projects)} new project(s) — full-stack, deployed, with a real use case.`,
    resume: hasInternship
      ? `Quantify internship impact (metrics, scale) and align bullets to target roles.`
      : `Convert projects + open-source PRs into resume bullets with measurable outcomes.`,
    linkedin:
      path === "off-campus"
        ? `Post weekly about projects/learnings, connect with recruiters at target companies, message alumni for referrals.`
        : `Keep profile current with projects and CGPA; engage lightly to build a network for backup off-campus paths.`,
  };

  // Risk
  let risk: RiskLevel;
  if ((strongCgpa && okDsa) || (i.tier === "tier1" && okDsa)) risk = "low";
  else if (okCgpa && okDsa) risk = "medium";
  else risk = "high";

  const riskReason =
    risk === "low"
      ? "Multiple viable paths; baseline placement is likely with consistent effort."
      : risk === "medium"
        ? "Outcome depends on closing 1-2 specific gaps in the next 3 months."
        : "Significant gaps across academics or skills — needs disciplined recovery plan.";

  // Outcomes
  const outcomes: string[] = [];
  if (i.tier === "tier1" && strongDsa)
    outcomes.push("Realistic shot at 25-40+ LPA product company offers.");
  else if (strongDsa && strongProjects)
    outcomes.push("Likely product-company offers in the 15-25 LPA range off-campus.");
  else if (okDsa && okCgpa)
    outcomes.push("Comfortable range for service + mid-tier product (6-12 LPA).");
  else outcomes.push("On-campus service company offers (3-6 LPA) most likely if gaps persist.");
  if (path !== "on-campus")
    outcomes.push("Off-campus pipeline can add 2-5 interview opportunities/month with active outreach.");
  if (!hasInternship)
    outcomes.push("Securing an internship in the next 3 months meaningfully shifts the offer ceiling.");

  return {
    path,
    pathLabel,
    reasoning,
    strengths,
    weaknesses,
    actionPlan,
    risk,
    riskReason,
    outcomes,
  };
}
