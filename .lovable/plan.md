# GradeVault Restructure — Phased Plan

Goal: turn GradeVault from a CGPA calculator into a Student Career OS without breaking any existing academic feature or stored data. The Coding Hub stats in the screenshot (LeetCode 1556, CF 928, etc.) become auto-synced from platform URLs/usernames instead of manual entry.

---

## Phase 1 — Foundation (data, validation, UX polish)

Goal: production-grade reliability on what already exists. No new modules.

1. **Validation hardening**
   - Shared `src/lib/validators.ts` (Zod): marks 0–max, credits 1–6 positive ints, USN regex, ratings 0–4000, URLs per-platform.
   - Wire into Calculator (block duplicate semesters, negative marks, credits=0), Settings (USN, branch, profile URLs), Placement Tracker (dedupe by company+role), Coding Hub numeric inputs (min/max/step).
   - Friendly inline error messages, not toasts only.

2. **State synchronization**
   - Audit every read; remove the last direct `localStorage.getItem` / `loadX()` calls from components. All reads via `useStudent()`; all writes via `updateProfile` / `updateSettings` / academic-store mutators.
   - One event bus channel per domain; debounce storm-prone listeners.

3. **LocalStorage consistency**
   - Single namespaced schema `gv:v2:*` with a migration shim that reads legacy keys once and rewrites.
   - Versioned profile envelope `{ version, updatedAt, data }` so future schema bumps are safe.
   - `profile-backup.ts` export/import already exists — add schema-version check on import.

4. **Mobile responsiveness**
   - Dashboard header → `grid-cols-[minmax(0,1fr)_auto]` + `min-w-0` + `truncate`.
   - All data tables wrapped in `overflow-x-auto`.
   - Coding Hub input grids collapse to 1 col < 480px.

5. **Empty / loading / error states**
   - Shared `<RouteShell loading empty error>` wrapper with skeletons.
   - Applied to Coding Hub, Readiness, Strategy, Placement, Suggestions, History.
   - Move auth gate into `_app` `beforeLoad` so child routes skip the redundant check.

6. **Calculation audit**
   - Single source for SGPA, CGPA, %, Readiness in `academic-store.ts` + `readiness.ts`. Remove duplicate helpers in routes. Add unit-style assertions (dev-only) on store init.

Deliverables: no UI redesign, no new pages. Everything keeps working; data layer becomes trustworthy.

---

## Phase 2 — Auto-sync + Public Profile + Kanban

Goal: replace manual coding stats with auto-pulled data and add the share-able profile.

1. **Coding platform auto-sync (the screenshot fix)**
   - Settings stores **usernames/URLs only** per platform: LeetCode, Codeforces, GitHub, Codolio, LinkedIn.
   - Server functions (`createServerFn`, runs in Worker, bypasses CORS):
     - `syncLeetCode(username)` → graphql.leetcode.com (solved by difficulty, contest rating, ranking, streak). Already partially built — extend to write into the profile store.
     - `syncCodeforces(handle)` → codeforces.com/api/user.info + user.rating (rating, max rating, contest count).
     - `syncGitHub(username)` → api.github.com/users/{u} + /users/{u}/repos (public repo count, OSS contributions estimate, active days from events API).
     - `syncCodolio(slug)` → scrape public profile JSON (aggregated DSA total).
     - `syncLinkedIn(url)` → metadata only (URL validity + display); no scraping, LinkedIn blocks it.
   - Coding Hub numeric inputs become **read-only display** with a "Sync now" button per platform and an auto-sync on profile-page mount (cached 1h in `gv:v2:sync-cache`). Manual override allowed via an "Edit manually" toggle so existing data isn't lost.
   - Per-platform last-synced timestamp + error toast on failure (no silent zeros).

2. **Placement Kanban Tracker**
   - New route `/_app/placement-tracker` (keep existing list view, add Kanban toggle).
   - Columns: Wishlist · Applied · OA · Interview · Offer · Rejected.
   - Drag-and-drop via `@dnd-kit/core` (already in deps; install if missing).
   - Data backs onto existing `applications` store — no schema break.

3. **Public profile architecture (Lovable Cloud)**
   - Tables (one migration, with GRANTs):
     - `profiles` — username (unique slug), display_name, branch, college, headline, avatar_url, links jsonb, visibility enum.
     - `profile_snapshots` — user_id, academic jsonb, coding jsonb, projects jsonb, updated_at. Snapshot pushed on every local profile save.
   - RLS: owner full access; public SELECT only when `visibility='public'`.
   - Route `/_authenticated/settings/profile` — claim username, toggle visibility, copy share link.
   - Public route `/u/$username` (SSR, loader → server fn `getPublicProfile`) renders read-only Career OS card: header, academics summary, coding stats, projects, placement readiness badge. OG tags from loader data for shareability.

4. **Profile completion system**
   - `computeCompletion(profile)` → weighted score across 7 sections (Basic, Academics, Resume, GitHub, LinkedIn, LeetCode/CF, Projects).
   - Persistent banner on Dashboard when < 100%; dismissible per-session, not permanent.
   - Section checklist on Settings with "Complete now" deep-links.

---

## Phase 3 — Repositioning

1. **Dashboard reorganization**
   - Top: identity card + completion ring + share-profile CTA.
   - Three pillars: Academics · Coding · Placements — each a summary card linking deeper.
   - Demote raw SGPA chart below the fold (kept, not removed).

2. **Student Career OS positioning**
   - Sidebar grouping: *Academics* (Dashboard, Calculator, Upload Marks, History) · *Growth* (Coding Hub, Suggestions, Roadmap, Strategy) · *Placements* (Tracker, Readiness) · *Profile* (Public Profile, Settings).
   - Marketing copy on landing / empty states updated.

3. **Public profile sharing**
   - Share dialog: copy link, QR, "Open in new tab".
   - OG image generated from profile data (static SSR HTML → screenshot-free design that renders well as link preview).

4. **Analytics (privacy-respecting)**
   - Local event counter (no third-party): profile views, syncs, kanban moves. Surface in Settings → "Activity".

---

## Technical notes

- **Stack**: TanStack Start + Lovable Cloud (already enabled). All external API calls via `createServerFn` to avoid CORS.
- **Migrations**: one per phase. Phase 1 has no DB change. Phase 2 adds `profiles` + `profile_snapshots` with RLS and GRANTs.
- **No-break guarantees**: localStorage migration is read-once + write-new; old keys retained for one release. Manual coding stats stay editable behind a toggle so users who liked manual entry don't lose control.
- **Auth**: stays passwordless (USN + name) for MVP. Public profile is keyed by claimed username, independent of auth provider — when real auth lands later, profiles just get linked to `auth.users.id`.
- **Out of scope**: LinkedIn scraping (ToS), email/password, mobile app, AI suggestions rewrite.

## Sequencing

Ship Phase 1 in one turn (no UI redesign, lots of small edits). Then Phase 2 in 2 turns (turn A: auto-sync + kanban; turn B: public profile + completion). Phase 3 in 1 turn.

Confirm to start with Phase 1.
