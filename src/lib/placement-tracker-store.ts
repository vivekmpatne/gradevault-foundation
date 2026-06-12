/**
 * Placement Tracker Store
 * Stores internship/placement applications per student in LocalStorage.
 * Structured so future integrations (GitHub/LinkedIn import, remote sync)
 * can plug in without breaking the shape.
 */
import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";

export const APPLICATION_STATUSES = [
  "Wishlist",
  "Applied",
  "OA Scheduled",
  "OA Completed",
  "Interview Scheduled",
  "Interview Completed",
  "HR Round",
  "Offer Received",
  "Rejected",
  "Hold",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type Application = {
  id: string;
  company: string;
  role: string;
  applicationDate: string; // ISO yyyy-mm-dd
  link?: string;
  location?: string;
  notes?: string;
  status: ApplicationStatus;
  createdAt: number;
  updatedAt: number;
  // Reserved for future integrations
  source?: "manual" | "linkedin" | "github";
  externalId?: string;
};

const EVENT = "gradevault:placement-tracker-changed";
const KEY_PREFIX = "gradevault_placement_tracker:";

function keyFor(usn: string) {
  return `${KEY_PREFIX}${usn}`;
}

function readAll(usn: string): Application[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(keyFor(usn));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Application[]) : [];
  } catch {
    return [];
  }
}

function writeAll(usn: string, apps: Application[]) {
  localStorage.setItem(keyFor(usn), JSON.stringify(apps));
  window.dispatchEvent(new Event(EVENT));
}

export function loadApplications(): Application[] {
  const s = getSession();
  if (!s) return [];
  return readAll(s.usn);
}

export function addApplication(
  input: Omit<Application, "id" | "createdAt" | "updatedAt">,
): Application | null {
  const s = getSession();
  if (!s) return null;
  const now = Date.now();
  const app: Application = {
    ...input,
    id: `app_${now}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    source: input.source ?? "manual",
  };
  const all = readAll(s.usn);
  all.unshift(app);
  writeAll(s.usn, all);
  return app;
}

export function updateApplication(
  id: string,
  patch: Partial<Omit<Application, "id" | "createdAt">>,
): void {
  const s = getSession();
  if (!s) return;
  const all = readAll(s.usn);
  const next = all.map((a) =>
    a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a,
  );
  writeAll(s.usn, next);
}

export function deleteApplication(id: string): void {
  const s = getSession();
  if (!s) return;
  writeAll(
    s.usn,
    readAll(s.usn).filter((a) => a.id !== id),
  );
}

export function useApplications(): Application[] {
  const [apps, setApps] = useState<Application[]>(() => loadApplications());
  useEffect(() => {
    const refresh = () => setApps(loadApplications());
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return apps;
}

export function statusBucket(s: ApplicationStatus): "wishlist" | "applied" | "oa" | "interview" | "offer" | "rejected" | "hold" {
  switch (s) {
    case "Wishlist": return "wishlist";
    case "Applied": return "applied";
    case "OA Scheduled":
    case "OA Completed": return "oa";
    case "Interview Scheduled":
    case "Interview Completed":
    case "HR Round": return "interview";
    case "Offer Received": return "offer";
    case "Rejected": return "rejected";
    case "Hold": return "hold";
  }
}
