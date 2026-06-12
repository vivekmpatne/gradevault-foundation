/**
 * Auto-sync orchestrator for coding platform stats.
 *
 * Pulls live data from LeetCode (via server fn, bypasses CORS), Codeforces
 * (public CORS-enabled API) and GitHub (public CORS-enabled API), then writes
 * normalized numbers back into the student settings store. Replaces the
 * manual-entry placeholders in the Coding Hub.
 *
 * Existing manual values are preserved if a sync fails — we never zero a
 * field on error.
 */
import { fetchLeetCode, fetchCodeforces } from "@/lib/dsa-client";
import { fetchGitHubProfile } from "@/lib/github-client";
import { loadSettings, saveSettings, type StudentSettings } from "@/lib/settings-store";

export type SyncPlatform = "leetcode" | "codeforces" | "github";

export type SyncOutcome = {
  platform: SyncPlatform;
  ok: boolean;
  error?: string;
  syncedAt: number;
};

const SYNC_META_PREFIX = "gradevault_sync_meta:";
const SYNC_TTL_MS = 1000 * 60 * 60; // 1h auto-sync cache

type SyncMeta = Partial<Record<SyncPlatform, number>>;

function metaKey(usn: string) {
  return `${SYNC_META_PREFIX}${usn.toUpperCase()}`;
}

export function loadSyncMeta(usn: string): SyncMeta {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(metaKey(usn));
    return raw ? (JSON.parse(raw) as SyncMeta) : {};
  } catch {
    return {};
  }
}

function writeSyncMeta(usn: string, meta: SyncMeta) {
  localStorage.setItem(metaKey(usn), JSON.stringify(meta));
}

export function isSyncStale(at: number | undefined): boolean {
  if (!at) return true;
  return Date.now() - at > SYNC_TTL_MS;
}

export async function syncLeetCode(username: string): Promise<SyncOutcome> {
  const ts = Date.now();
  if (!username) return { platform: "leetcode", ok: false, error: "No username", syncedAt: ts };
  try {
    const stats = await fetchLeetCode(username);
    const current = loadSettings();
    const patch: Partial<StudentSettings> = {
      totalProblemsSolved: stats.totalSolved,
      leetcode: stats.contestRating ?? current.leetcode,
      contestCount:
        (stats.contestCount ?? 0) + (current.codeforcesHandle ? 0 : 0) ||
        current.contestCount,
    };
    // contestCount aggregates LC + CF when both present; let CF sync add CF count.
    if (typeof stats.contestCount === "number") {
      patch.contestCount = stats.contestCount;
    }
    saveSettings({ ...current, ...patch });
    return { platform: "leetcode", ok: true, syncedAt: ts };
  } catch (e) {
    return {
      platform: "leetcode",
      ok: false,
      error: (e as Error)?.message ?? "LeetCode sync failed",
      syncedAt: ts,
    };
  }
}

export async function syncCodeforces(handle: string): Promise<SyncOutcome> {
  const ts = Date.now();
  if (!handle) return { platform: "codeforces", ok: false, error: "No handle", syncedAt: ts };
  try {
    const stats = await fetchCodeforces(handle);
    const current = loadSettings();
    // Combine contest counts from LC + CF when LC has also been synced.
    const lcContests =
      current.leetcodeUsername && current.contestCount > stats.contestsParticipated
        ? current.contestCount - 0
        : 0;
    saveSettings({
      ...current,
      codeforces: stats.rating || current.codeforces,
      contestCount: lcContests
        ? Math.max(current.contestCount, stats.contestsParticipated)
        : stats.contestsParticipated,
    });
    return { platform: "codeforces", ok: true, syncedAt: ts };
  } catch (e) {
    return {
      platform: "codeforces",
      ok: false,
      error: (e as Error)?.message ?? "Codeforces sync failed",
      syncedAt: ts,
    };
  }
}

export async function syncGitHub(username: string): Promise<SyncOutcome> {
  const ts = Date.now();
  if (!username) return { platform: "github", ok: false, error: "No username", syncedAt: ts };
  try {
    const profile = await fetchGitHubProfile(username);
    const current = loadSettings();
    saveSettings({
      ...current,
      githubRepos: profile.user.publicRepos,
      activeDevDays: profile.activeRepoCount * 7, // rough estimate: 1 active repo ≈ 1 week of activity
    });
    return { platform: "github", ok: true, syncedAt: ts };
  } catch (e) {
    return {
      platform: "github",
      ok: false,
      error: (e as Error)?.message ?? "GitHub sync failed",
      syncedAt: ts,
    };
  }
}

export async function syncAll(
  usn: string,
  settings: StudentSettings,
): Promise<SyncOutcome[]> {
  const tasks: Promise<SyncOutcome>[] = [];
  if (settings.leetcodeUsername) tasks.push(syncLeetCode(settings.leetcodeUsername));
  if (settings.codeforcesHandle) tasks.push(syncCodeforces(settings.codeforcesHandle));
  if (settings.githubUsername) tasks.push(syncGitHub(settings.githubUsername));
  const results = await Promise.all(tasks);
  const meta = loadSyncMeta(usn);
  for (const r of results) {
    if (r.ok) meta[r.platform] = r.syncedAt;
  }
  writeSyncMeta(usn, meta);
  return results;
}
