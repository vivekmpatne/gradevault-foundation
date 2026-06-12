/**
 * LeetCode + Codeforces analytics client.
 * - Codeforces: official public API (CORS-enabled).
 * - LeetCode: server function proxies the official GraphQL endpoint to
 *   side-step browser CORS and the unreliable community proxies.
 * Results cached in LocalStorage per handle with a 30-min TTL.
 */

import { fetchLeetCodeStats } from "./leetcode.functions";



export type LeetCodeStats = {
  username: string;
  fetchedAt: number;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  ranking: number;
  contestRating: number | null;
  contestCount: number | null;
  history: { contest: string; rating: number }[]; // best-effort, may be empty
};

export type CodeforcesStats = {
  handle: string;
  fetchedAt: number;
  rating: number;
  maxRating: number;
  rank: string;
  maxRank: string;
  contestsParticipated: number;
  history: { contest: string; rating: number; time: number }[];
};

const LC_PREFIX = "gradevault_lc_cache:";
const CF_PREFIX = "gradevault_cf_cache:";
const TTL = 1000 * 60 * 30;

const lcKey = (u: string) => `${LC_PREFIX}${u.toLowerCase()}`;
const cfKey = (h: string) => `${CF_PREFIX}${h.toLowerCase()}`;

export function loadCachedLeetCode(u: string): LeetCodeStats | null {
  if (typeof window === "undefined" || !u) return null;
  try {
    const raw = localStorage.getItem(lcKey(u));
    return raw ? (JSON.parse(raw) as LeetCodeStats) : null;
  } catch {
    return null;
  }
}
export function loadCachedCodeforces(h: string): CodeforcesStats | null {
  if (typeof window === "undefined" || !h) return null;
  try {
    const raw = localStorage.getItem(cfKey(h));
    return raw ? (JSON.parse(raw) as CodeforcesStats) : null;
  } catch {
    return null;
  }
}
export function isFresh(s: { fetchedAt: number } | null): boolean {
  return !!s && Date.now() - s.fetchedAt < TTL;
}


export async function fetchLeetCode(username: string): Promise<LeetCodeStats> {
  const clean = username.trim().replace(/^@/, "");
  if (!clean) throw new Error("LeetCode username is required");

  // Server function proxies LeetCode's GraphQL endpoint, side-stepping
  // browser CORS and the previously-flaky community proxy that produced
  // "Failed to fetch" on production.
  let server;
  try {
    server = await fetchLeetCodeStats({ data: { username: clean } });
  } catch (e) {
    throw new Error(
      (e as Error)?.message?.replace(/^Error:\s*/, "") ||
        "LeetCode lookup failed",
    );
  }

  const out: LeetCodeStats = {
    username: server.username,
    fetchedAt: Date.now(),
    totalSolved: server.totalSolved,
    easySolved: server.easySolved,
    mediumSolved: server.mediumSolved,
    hardSolved: server.hardSolved,
    ranking: server.ranking,
    contestRating: server.contestRating,
    contestCount: server.contestCount,
    history: server.history
      .slice()
      .sort((a, b) => a.attendedAt - b.attendedAt)
      .map((h) => ({ contest: h.contest, rating: h.rating })),
  };
  localStorage.setItem(lcKey(clean), JSON.stringify(out));
  return out;
}

export async function fetchCodeforces(handle: string): Promise<CodeforcesStats> {
  const clean = handle.trim().replace(/^@/, "");
  if (!clean) throw new Error("Codeforces handle is required");

  const infoRes = await fetch(
    `https://codeforces.com/api/user.info?handles=${encodeURIComponent(clean)}`,
  );
  if (!infoRes.ok) throw new Error(`Codeforces info failed (${infoRes.status})`);
  const info = (await infoRes.json()) as {
    status: string;
    comment?: string;
    result?: Array<{
      rating?: number;
      maxRating?: number;
      rank?: string;
      maxRank?: string;
    }>;
  };
  if (info.status !== "OK" || !info.result?.length)
    throw new Error(info.comment || "Codeforces user not found");
  const u = info.result[0];

  const rRes = await fetch(
    `https://codeforces.com/api/user.rating?handle=${encodeURIComponent(clean)}`,
  );
  let history: CodeforcesStats["history"] = [];
  if (rRes.ok) {
    const r = (await rRes.json()) as {
      status: string;
      result?: Array<{
        contestName: string;
        newRating: number;
        ratingUpdateTimeSeconds: number;
      }>;
    };
    if (r.status === "OK" && r.result) {
      history = r.result.map((c) => ({
        contest: c.contestName,
        rating: c.newRating,
        time: c.ratingUpdateTimeSeconds * 1000,
      }));
    }
  }

  const out: CodeforcesStats = {
    handle: clean,
    fetchedAt: Date.now(),
    rating: u.rating ?? 0,
    maxRating: u.maxRating ?? 0,
    rank: u.rank ?? "unrated",
    maxRank: u.maxRank ?? "unrated",
    contestsParticipated: history.length,
    history,
  };
  localStorage.setItem(cfKey(clean), JSON.stringify(out));
  return out;
}

/** DSA Readiness Score 0..100 from LC + CF stats. */
export function computeDsaReadiness(
  lc: LeetCodeStats | null,
  cf: CodeforcesStats | null,
): number {
  // LeetCode contribution: up to 55
  const solved = lc?.totalSolved ?? 0;
  const solvedScore = Math.min(25, (solved / 500) * 25);
  const hard = lc?.hardSolved ?? 0;
  const hardScore = Math.min(10, (hard / 50) * 10);
  const lcRating = lc?.contestRating ?? 0;
  const lcRatingScore = Math.min(20, (Math.max(0, lcRating - 1200) / 800) * 20);

  // Codeforces contribution: up to 45
  const cfRating = cf?.rating ?? 0;
  const cfRatingScore = Math.min(30, (Math.max(0, cfRating - 800) / 1200) * 30);
  const cfContests = cf?.contestsParticipated ?? 0;
  const cfContestScore = Math.min(15, (cfContests / 20) * 15);

  return Math.round(
    solvedScore + hardScore + lcRatingScore + cfRatingScore + cfContestScore,
  );
}

export type DsaTier = {
  label: "Beginner" | "Intermediate" | "Interview Ready" | "Competitive Candidate";
  tone: "slate" | "indigo" | "emerald" | "amber";
  blurb: string;
};

export function dsaTier(score: number): DsaTier {
  if (score >= 81)
    return {
      label: "Competitive Candidate",
      tone: "amber",
      blurb: "Top-tier profile — keep contests warm and start system design.",
    };
  if (score >= 61)
    return {
      label: "Interview Ready",
      tone: "emerald",
      blurb: "Solid base — target tagged mediums/hards and mock interviews.",
    };
  if (score >= 31)
    return {
      label: "Intermediate",
      tone: "indigo",
      blurb: "Good momentum — increase contest frequency and tackle weak topics.",
    };
  return {
    label: "Beginner",
    tone: "slate",
    blurb: "Build a daily habit — focus on Easy/Medium patterns first.",
  };
}
