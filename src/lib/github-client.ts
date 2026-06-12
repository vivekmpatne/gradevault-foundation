/**
 * Lightweight GitHub client using the public unauthenticated REST API.
 * No secrets required — CORS is enabled. Rate-limited to 60 requests/hr/IP,
 * so we cache aggressively in LocalStorage (per username).
 */

export type GitHubLang = { name: string; bytes: number; pct: number };

export type GitHubRepoLite = {
  id: number;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  pushedAt: string;
  archived: boolean;
  fork: boolean;
};

export type GitHubProfile = {
  username: string;
  fetchedAt: number;
  user: {
    login: string;
    name: string | null;
    avatarUrl: string;
    htmlUrl: string;
    bio: string | null;
    publicRepos: number;
    followers: number;
    following: number;
    createdAt: string;
  };
  totalStars: number;
  topLanguages: GitHubLang[];
  recentRepos: GitHubRepoLite[]; // sorted by pushedAt desc, max 5
  activeRepoCount: number; // pushed within last 90 days
  recentPushCount: number; // pushed within last 30 days
  distinctLanguages: number;
  healthScore: number; // 0..100
};

const CACHE_PREFIX = "gradevault_github_cache:";
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

function cacheKey(username: string) {
  return `${CACHE_PREFIX}${username.toLowerCase()}`;
}

export function loadCachedProfile(username: string): GitHubProfile | null {
  if (typeof window === "undefined" || !username) return null;
  try {
    const raw = localStorage.getItem(cacheKey(username));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GitHubProfile;
    return parsed;
  } catch {
    return null;
  }
}

function saveCachedProfile(p: GitHubProfile) {
  localStorage.setItem(cacheKey(p.username), JSON.stringify(p));
}

export function isCacheFresh(p: GitHubProfile | null): boolean {
  return !!p && Date.now() - p.fetchedAt < CACHE_TTL_MS;
}

function daysBetween(a: number, b: number) {
  return Math.abs(a - b) / (1000 * 60 * 60 * 24);
}

function computeHealth(args: {
  publicRepos: number;
  activeRepoCount: number;
  recentPushCount: number;
  distinctLanguages: number;
  totalStars: number;
}): number {
  // Active repos (pushed within 90d): up to 35 (8 repos saturates)
  const active = Math.min(35, (args.activeRepoCount / 8) * 35);
  // Recent activity (pushed within 30d): up to 30 (5 repos saturates)
  const recent = Math.min(30, (args.recentPushCount / 5) * 30);
  // Project diversity (distinct primary languages): up to 20 (5 langs saturates)
  const diversity = Math.min(20, (args.distinctLanguages / 5) * 20);
  // Bonus for stars + repo count: up to 15
  const repoBonus = Math.min(8, (args.publicRepos / 20) * 8);
  const starBonus = Math.min(7, Math.log10(args.totalStars + 1) * 5);
  return Math.round(active + recent + diversity + repoBonus + starBonus);
}

export async function fetchGitHubProfile(
  username: string,
): Promise<GitHubProfile> {
  const clean = username.trim().replace(/^@/, "");
  if (!clean) throw new Error("GitHub username is required");

  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(clean)}`);
  if (userRes.status === 404) throw new Error(`GitHub user "${clean}" not found`);
  if (userRes.status === 403)
    throw new Error("GitHub API rate limit reached. Try again in a few minutes.");
  if (!userRes.ok) throw new Error(`GitHub user lookup failed (${userRes.status})`);
  const user = await userRes.json();

  // Up to 100 most recently updated public repos (plenty for top-language stats)
  const reposRes = await fetch(
    `https://api.github.com/users/${encodeURIComponent(clean)}/repos?per_page=100&sort=pushed&type=owner`,
  );
  if (!reposRes.ok) throw new Error(`GitHub repos lookup failed (${reposRes.status})`);
  const reposRaw = (await reposRes.json()) as Array<{
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    stargazers_count: number;
    forks_count: number;
    language: string | null;
    pushed_at: string;
    archived: boolean;
    fork: boolean;
  }>;

  const now = Date.now();
  const ownedNonFork = reposRaw.filter((r) => !r.fork);
  const totalStars = ownedNonFork.reduce((s, r) => s + (r.stargazers_count || 0), 0);

  // Language stats from primary `language` field (avoids N extra requests).
  const langCounts = new Map<string, number>();
  for (const r of ownedNonFork) {
    if (!r.language) continue;
    langCounts.set(r.language, (langCounts.get(r.language) ?? 0) + 1);
  }
  const totalLang = Array.from(langCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const topLanguages: GitHubLang[] = Array.from(langCounts.entries())
    .map(([name, bytes]) => ({
      name,
      bytes,
      pct: Math.round((bytes / totalLang) * 100),
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 6);

  const recentRepos: GitHubRepoLite[] = reposRaw
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      url: r.html_url,
      description: r.description,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language,
      pushedAt: r.pushed_at,
      archived: r.archived,
      fork: r.fork,
    }));

  const activeRepoCount = ownedNonFork.filter(
    (r) => r.pushed_at && daysBetween(now, new Date(r.pushed_at).getTime()) <= 90,
  ).length;
  const recentPushCount = ownedNonFork.filter(
    (r) => r.pushed_at && daysBetween(now, new Date(r.pushed_at).getTime()) <= 30,
  ).length;
  const distinctLanguages = langCounts.size;

  const healthScore = computeHealth({
    publicRepos: user.public_repos ?? 0,
    activeRepoCount,
    recentPushCount,
    distinctLanguages,
    totalStars,
  });

  const profile: GitHubProfile = {
    username: clean,
    fetchedAt: now,
    user: {
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      htmlUrl: user.html_url,
      bio: user.bio,
      publicRepos: user.public_repos ?? 0,
      followers: user.followers ?? 0,
      following: user.following ?? 0,
      createdAt: user.created_at,
    },
    totalStars,
    topLanguages,
    recentRepos,
    activeRepoCount,
    recentPushCount,
    distinctLanguages,
    healthScore,
  };

  saveCachedProfile(profile);
  return profile;
}

export function portfolioStrengthLabel(score: number): {
  label: string;
  tone: "good" | "ok" | "warn" | "bad";
} {
  if (score >= 80) return { label: "Excellent", tone: "good" };
  if (score >= 60) return { label: "Strong", tone: "good" };
  if (score >= 40) return { label: "Developing", tone: "ok" };
  if (score >= 20) return { label: "Sparse", tone: "warn" };
  return { label: "Inactive", tone: "bad" };
}
