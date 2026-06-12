/**
 * Full-profile backup / restore.
 *
 * Snapshots every `gradevault_*` LocalStorage key that belongs to the
 * currently signed-in USN. Restores them atomically and fires the
 * matching events so every consumer re-renders without a reload.
 */
import { getSession, STUDENTS_EVENT } from "@/lib/auth";

const SCOPED_PREFIXES = [
  "gradevault_calc_", // semester drafts
  "gradevault_settings_",
  "gradevault_readiness:",
  "gradevault_placement_tracker:",
  "gradevault_strategy:",
  "gradevault_feedback:",
  "gradevault_github_cache:",
  "gradevault_leetcode_cache:",
  "gradevault_codeforces_cache:",
] as const;

const EVENTS_TO_FIRE = [
  "gradevault:academic-changed",
  "gradevault:settings-changed",
  "gradevault:readiness-changed",
  "gradevault:placement-tracker-changed",
  "gradevault:strategy-changed",
  "gradevault:feedback-changed",
  STUDENTS_EVENT,
] as const;

export type ProfileBackup = {
  version: 2;
  exportedAt: string;
  usn: string;
  entries: Record<string, string>;
};

function isScopedKey(key: string, usn: string): boolean {
  const u = usn.toUpperCase();
  return SCOPED_PREFIXES.some((p) => {
    if (!key.startsWith(p)) return false;
    const suffix = key.slice(p.length);
    // Either exact match (e.g. settings) or starts with USN
    return suffix.toUpperCase() === u || suffix.toUpperCase().startsWith(u);
  });
}

export function exportProfile(): ProfileBackup | null {
  if (typeof window === "undefined") return null;
  const session = getSession();
  if (!session) return null;
  const entries: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (isScopedKey(k, session.usn)) {
      const v = localStorage.getItem(k);
      if (v !== null) entries[k] = v;
    }
  }
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    usn: session.usn,
    entries,
  };
}

export function downloadProfileBackup(): boolean {
  const snap = exportProfile();
  if (!snap) return false;
  const blob = new Blob([JSON.stringify(snap, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gradevault-${snap.usn}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

export type ImportResult = { ok: boolean; restored: number; error?: string };

export function importProfile(raw: string): ImportResult {
  if (typeof window === "undefined") return { ok: false, restored: 0, error: "Unavailable" };
  const session = getSession();
  if (!session) return { ok: false, restored: 0, error: "Sign in first" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, restored: 0, error: "Invalid JSON" };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, restored: 0, error: "Invalid backup file" };
  }

  // Support v2 (full snapshot) and legacy v1 ({ settings, semesters }).
  const obj = parsed as Record<string, unknown>;
  let restored = 0;

  if (obj.entries && typeof obj.entries === "object") {
    for (const [key, value] of Object.entries(obj.entries as Record<string, string>)) {
      if (typeof value !== "string") continue;
      // Re-scope keys to current USN so a backup can be restored under a
      // different account without losing its data.
      const remapped = remapKeyToCurrentUsn(key, obj.usn as string | undefined, session.usn);
      if (!remapped) continue;
      localStorage.setItem(remapped, value);
      restored++;
    }
  } else {
    // Legacy v1
    if (obj.settings) {
      localStorage.setItem(
        `gradevault_settings_${session.usn.toUpperCase()}`,
        JSON.stringify(obj.settings),
      );
      restored++;
    }
    if (obj.semesters && typeof obj.semesters === "object") {
      localStorage.setItem(
        `gradevault_calc_${session.usn.toUpperCase()}`,
        JSON.stringify(obj.semesters),
      );
      restored++;
    }
  }

  EVENTS_TO_FIRE.forEach((e) => window.dispatchEvent(new Event(e)));
  return { ok: true, restored };
}

function remapKeyToCurrentUsn(
  key: string,
  fromUsn: string | undefined,
  toUsn: string,
): string | null {
  const from = (fromUsn || "").toUpperCase();
  const to = toUsn.toUpperCase();
  for (const p of SCOPED_PREFIXES) {
    if (key.startsWith(p)) {
      const suffix = key.slice(p.length).toUpperCase();
      if (!from || suffix === from || suffix.startsWith(from)) {
        return `${p}${to}${suffix.slice(from.length)}`;
      }
      return key;
    }
  }
  return null;
}
