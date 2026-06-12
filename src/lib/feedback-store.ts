/**
 * Feedback Center store.
 * Stored as a single global LocalStorage list so "Developer Mode" can
 * surface every submission. Each entry records the author.
 */
import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";

export const FEEDBACK_CATEGORIES = [
  "Bug Report",
  "Feature Request",
  "UI/UX Feedback",
  "General Feedback",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export type FeedbackEntry = {
  id: string;
  category: FeedbackCategory;
  rating: number; // 1..10
  comment: string;
  authorName: string;
  authorUsn: string;
  createdAt: number;
};

const KEY = "gradevault_feedback";
const EVENT = "gradevault:feedback-changed";

function readAll(): FeedbackEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FeedbackEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: FeedbackEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}

export function loadFeedback(): FeedbackEntry[] {
  return readAll();
}

export function addFeedback(input: {
  category: FeedbackCategory;
  rating: number;
  comment: string;
}): FeedbackEntry | null {
  const s = getSession();
  const now = Date.now();
  const comment = input.comment.trim();
  if (!comment) return null;
  const all = readAll();
  // Dedupe: same author + category + identical comment within 5 minutes
  // suppresses double-submits from accidental double-clicks.
  const recentWindow = 5 * 60 * 1000;
  const isDuplicate = all.some(
    (e) =>
      e.authorUsn === (s?.usn ?? "—") &&
      e.category === input.category &&
      e.comment.trim().toLowerCase() === comment.toLowerCase() &&
      now - e.createdAt < recentWindow,
  );
  if (isDuplicate) return null;
  const entry: FeedbackEntry = {
    id: `fb_${now}_${Math.random().toString(36).slice(2, 8)}`,
    category: input.category,
    rating: Math.min(10, Math.max(1, Math.round(input.rating))),
    comment,
    authorName: s?.name ?? "Anonymous",
    authorUsn: s?.usn ?? "—",
    createdAt: now,
  };
  all.unshift(entry);
  writeAll(all);
  return entry;
}

export function deleteFeedback(id: string) {
  writeAll(readAll().filter((e) => e.id !== id));
}

export function useFeedback(): FeedbackEntry[] {
  const [items, setItems] = useState<FeedbackEntry[]>(() => readAll());
  useEffect(() => {
    const refresh = () => setItems(readAll());
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return items;
}
