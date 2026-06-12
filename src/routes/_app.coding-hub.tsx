import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Code2,
  Github,
  Trophy,
  Link2,
  Flame,
  GitBranch,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Boxes,
  Calendar,
  Hash,
  RefreshCw,
  Lock,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useStudent, updateSettings } from "@/lib/student-store";
import { cn } from "@/lib/utils";
import { GithubIntegrationPanel } from "@/components/github-integration-panel";
import { DsaAnalyticsPanel } from "@/components/dsa-analytics-panel";
import {
  loadSyncMeta,
  isSyncStale,
  syncAll,
  type SyncOutcome,
  type SyncPlatform,
} from "@/lib/coding-sync";

export const Route = createFileRoute("/_app/coding-hub")({
  component: CodingHubPage,
});


function CodingHubPage() {
  const { settings, academic } = useStudent();
  const usn = academic.student?.profile.usn ?? "";

  const [syncing, setSyncing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [meta, setMeta] = useState<Partial<Record<SyncPlatform, number>>>({});
  const autoRanRef = useRef(false);

  useEffect(() => {
    if (usn) setMeta(loadSyncMeta(usn));
  }, [usn]);

  const handles = useMemo(
    () => ({
      leetcode: settings.leetcodeUsername,
      codeforces: settings.codeforcesHandle,
      github: settings.githubUsername,
    }),
    [settings.leetcodeUsername, settings.codeforcesHandle, settings.githubUsername],
  );

  async function runSync(opts?: { silent?: boolean }) {
    if (!usn) return;
    if (!handles.leetcode && !handles.codeforces && !handles.github) {
      if (!opts?.silent)
        toast.error("Add a LeetCode, Codeforces or GitHub username first.");
      return;
    }
    setSyncing(true);
    try {
      const results: SyncOutcome[] = await syncAll(usn, settings);
      setMeta(loadSyncMeta(usn));
      if (!opts?.silent) {
        for (const r of results) {
          if (r.ok) toast.success(`${labelFor(r.platform)} synced`);
          else toast.error(`${labelFor(r.platform)}: ${r.error}`);
        }
      }
    } finally {
      setSyncing(false);
    }
  }

  // Auto-sync once on mount when any linked platform's cache is stale.
  useEffect(() => {
    if (autoRanRef.current || !usn) return;
    const anyLinked = handles.leetcode || handles.codeforces || handles.github;
    if (!anyLinked) return;
    const stale =
      (handles.leetcode && isSyncStale(meta.leetcode)) ||
      (handles.codeforces && isSyncStale(meta.codeforces)) ||
      (handles.github && isSyncStale(meta.github));
    if (!stale) return;
    autoRanRef.current = true;
    void runSync({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usn, handles.leetcode, handles.codeforces, handles.github, meta]);

  const update = <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K],
  ) => {
    updateSettings({ [key]: value } as Partial<typeof settings>);
  };


  const linkedAccounts = useMemo(() => {
    const list: { label: string; value: string; url?: string }[] = [];
    if (settings.codolioUrl)
      list.push({ label: "Codolio", value: settings.codolioUrl, url: settings.codolioUrl });
    if (settings.githubUsername)
      list.push({
        label: "GitHub",
        value: settings.githubUsername,
        url: `https://github.com/${settings.githubUsername}`,
      });
    if (settings.leetcodeUsername)
      list.push({
        label: "LeetCode",
        value: settings.leetcodeUsername,
        url: `https://leetcode.com/${settings.leetcodeUsername}`,
      });
    if (settings.codeforcesHandle)
      list.push({
        label: "Codeforces",
        value: settings.codeforcesHandle,
        url: `https://codeforces.com/profile/${settings.codeforcesHandle}`,
      });
    return list;
  }, [settings]);

  const primaryPlatform = useMemo(() => {
    const lc = settings.leetcode || 0;
    const cf = settings.codeforces || 0;
    if (lc === 0 && cf === 0) return "—";
    // Normalize: LeetCode out of 2000, CF out of 1800
    return lc / 2000 >= cf / 1800 ? "LeetCode" : "Codeforces";
  }, [settings.leetcode, settings.codeforces]);

  // Profile completion: 10 trackable fields
  const completion = useMemo(() => {
    const checks = [
      settings.codolioUrl,
      settings.githubUsername,
      settings.leetcodeUsername,
      settings.codeforcesHandle,
      settings.totalProblemsSolved > 0,
      settings.leetcode > 0,
      settings.codeforces > 0,
      settings.projects > 0,
      settings.githubRepos > 0,
      settings.contestCount > 0,
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [settings]);

  // Sub-scores for the tracker cards
  const dsaScore = useMemo(() => {
    const lc = Math.min(50, (settings.leetcode / 2000) * 50);
    const cf = Math.min(30, (settings.codeforces / 1800) * 30);
    const problems = Math.min(20, (settings.totalProblemsSolved / 500) * 20);
    return Math.round(lc + cf + problems);
  }, [settings.leetcode, settings.codeforces, settings.totalProblemsSolved]);

  const devScore = useMemo(() => {
    const proj = Math.min(40, (settings.projects / 5) * 40);
    const repos = Math.min(25, (settings.githubRepos / 15) * 25);
    const oss = Math.min(20, (settings.openSourceContributions / 10) * 20);
    const days = Math.min(15, (settings.activeDevDays / 90) * 15);
    return Math.round(proj + repos + oss + days);
  }, [
    settings.projects,
    settings.githubRepos,
    settings.openSourceContributions,
    settings.activeDevDays,
  ]);

  // Contribution to placement readiness (rough re-use of the readiness model)
  const placementContribution = useMemo(() => {
    const dsa = Math.round((dsaScore / 100) * 40); // up to 40
    const projects = Math.round((Math.min(25, (settings.projects / 5) * 15) + (settings.openSourceContributions > 0 ? 5 : 0)));
    return Math.min(65, dsa + projects); // out of the 65 non-academic+resume points
  }, [dsaScore, settings.projects, settings.openSourceContributions]);

  // Career insights
  const insights = useMemo(() => {
    const list: string[] = [];
    const strongDsa = dsaScore >= 60;
    const weakDsa = dsaScore < 35;
    const strongDev = devScore >= 60;
    const weakDev = devScore < 35;

    if (strongDsa && weakDev)
      list.push("Strong DSA but weak development — invest the next sprint in a deployed full-stack project.");
    if (strongDev && weakDsa)
      list.push("Strong projects but contest activity is low — start weekly contests to lift your DSA rating.");
    if (strongDsa && strongDev)
      list.push("Balanced profile — focus on interview practice and system design next.");
    if (weakDsa && weakDev)
      list.push("Both tracks need attention — pick ONE (DSA or projects) and ship 4 weeks of consistent work before splitting time.");
    if (settings.contestCount < 5)
      list.push(`Only ${settings.contestCount || 0} contests logged — aim for 1 LeetCode / Codeforces contest per week.`);
    if (settings.openSourceContributions === 0)
      list.push("No open-source contributions yet — one merged PR significantly boosts recruiter signal.");
    if (settings.currentStreak >= 30)
      list.push(`🔥 ${settings.currentStreak}-day streak — consistency is your edge.`);
    if (!settings.codolioUrl && !settings.githubUsername)
      list.push("Link at least one public profile (Codolio or GitHub) so the hub can showcase your work.");
    if (list.length === 0)
      list.push("Fill in your coding stats above to unlock personalized insights.");
    return list;
  }, [dsaScore, devScore, settings]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Code2 className="size-7" /> Coding Profile Hub
        </h1>
        <p className="text-muted-foreground mt-1">
          One place for your coding identity and development progress.
        </p>
      </div>

      {/* 1. Profile Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Summary</CardTitle>
          <CardDescription>
            Linked accounts and completion status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <SummaryStat
              label="Primary Platform"
              value={primaryPlatform}
              icon={Trophy}
            />
            <SummaryStat
              label="Linked Accounts"
              value={`${linkedAccounts.length} / 4`}
              icon={Link2}
            />
            <SummaryStat
              label="Profile Completion"
              value={`${completion}%`}
              icon={CheckCircle2}
            />
          </div>
          <div>
            <Progress value={completion} />
          </div>
          {linkedAccounts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {linkedAccounts.map((a) => (
                <a
                  key={a.label}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs rounded-md border px-2.5 py-1 hover:bg-muted/40 transition-colors"
                >
                  <span className="font-medium">{a.label}</span>
                  <span className="text-muted-foreground truncate max-w-[140px]">
                    {a.value}
                  </span>
                  <ExternalLink className="size-3" />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked profile inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Linked Profiles</CardTitle>
          <CardDescription>Saved automatically — synced with Settings.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <TextField
            label="Codolio Profile URL"
            value={settings.codolioUrl}
            placeholder="https://codolio.com/profile/..."
            onCommit={(v) => update("codolioUrl", v)}
          />
          <TextField
            label="GitHub Username"
            value={settings.githubUsername}
            placeholder="octocat"
            onCommit={(v) => update("githubUsername", v)}
          />
          <TextField
            label="LeetCode Username"
            value={settings.leetcodeUsername}
            placeholder="your-handle"
            onCommit={(v) => update("leetcodeUsername", v)}
          />
          <TextField
            label="Codeforces Handle"
            value={settings.codeforcesHandle}
            placeholder="tourist"
            onCommit={(v) => update("codeforcesHandle", v)}
          />
        </CardContent>
      </Card>

      {/* GitHub Integration (live) */}
      <GithubIntegrationPanel username={settings.githubUsername} />

      {/* DSA Analytics (LeetCode + Codeforces) */}
      <DsaAnalyticsPanel
        leetcodeUsername={settings.leetcodeUsername}
        codeforcesHandle={settings.codeforcesHandle}
      />




      {/* 2. Coding Progress — auto-synced */}
      <Card>
        <CardHeader>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                <Hash className="size-5 shrink-0" />
                <span className="truncate">Coding Progress</span>
                {!editMode && (
                  <Badge variant="outline" className="hidden sm:inline-flex">
                    <Lock className="size-3 mr-1" /> Auto-synced
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {editMode
                  ? "Manual edit on — values will be overwritten on next sync."
                  : "Pulled live from your linked profiles."}{" "}
                <SyncedAt meta={meta} />
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditMode((v) => !v)}
              >
                <Pencil className="size-3.5" />
                {editMode ? "Done" : "Edit"}
              </Button>
              <Button size="sm" onClick={() => runSync()} disabled={syncing}>
                <RefreshCw
                  className={cn("size-3.5", syncing && "animate-spin")}
                />
                {syncing ? "Syncing…" : "Sync now"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <NumField
            label="Total Problems Solved"
            value={settings.totalProblemsSolved}
            onCommit={(v) => update("totalProblemsSolved", v)}
            max={10_000}
            readOnly={!editMode}
            syncedFrom={handles.leetcode ? "LeetCode" : undefined}
          />
          <NumField
            label="LeetCode Rating"
            value={settings.leetcode}
            onCommit={(v) => update("leetcode", v)}
            max={4000}
            readOnly={!editMode}
            syncedFrom={handles.leetcode ? "LeetCode" : undefined}
          />
          <NumField
            label="Codeforces Rating"
            value={settings.codeforces}
            onCommit={(v) => update("codeforces", v)}
            max={4500}
            readOnly={!editMode}
            syncedFrom={handles.codeforces ? "Codeforces" : undefined}
          />
          <NumField
            label="Contest Count"
            value={settings.contestCount}
            onCommit={(v) => update("contestCount", v)}
            max={2000}
            readOnly={!editMode}
            syncedFrom={
              handles.leetcode || handles.codeforces ? "LC + CF" : undefined
            }
          />
          <NumField
            label="Current Streak (days)"
            value={settings.currentStreak}
            onCommit={(v) => update("currentStreak", v)}
            max={3650}
          />
        </CardContent>
      </Card>


      {/* 3. Development Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="size-5" /> Development Progress
          </CardTitle>
          <CardDescription>Projects, repos, and OSS activity.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <NumField
            label="Projects Built"
            value={settings.projects}
            onCommit={(v) => update("projects", v)}
            max={200}
          />
          <NumField
            label="GitHub Repositories"
            value={settings.githubRepos}
            onCommit={(v) => update("githubRepos", v)}
            max={2000}
            readOnly={!editMode && !!handles.github}
            syncedFrom={handles.github ? "GitHub" : undefined}
          />
          <NumField
            label="Open-Source Contributions"
            value={settings.openSourceContributions}
            onCommit={(v) => update("openSourceContributions", v)}
            max={2000}
          />
          <NumField
            label="Active Development Days"
            value={settings.activeDevDays}
            onCommit={(v) => update("activeDevDays", v)}
            max={3650}
            readOnly={!editMode && !!handles.github}
            syncedFrom={handles.github ? "GitHub" : undefined}
          />

        </CardContent>
      </Card>

      {/* 4. Progress Tracker cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <TrackerCard
          title="DSA Progress"
          icon={Hash}
          score={dsaScore}
          tone="indigo"
          caption={`LC ${settings.leetcode || 0} · CF ${settings.codeforces || 0} · ${settings.totalProblemsSolved || 0} solved`}
        />
        <TrackerCard
          title="Development Progress"
          icon={Boxes}
          score={devScore}
          tone="emerald"
          caption={`${settings.projects || 0} projects · ${settings.githubRepos || 0} repos · ${settings.openSourceContributions || 0} OSS`}
        />
        <TrackerCard
          title="Placement Readiness Contribution"
          icon={Trophy}
          score={placementContribution}
          max={65}
          tone="amber"
          caption="DSA + Projects portion of overall readiness."
        />
      </div>

      {/* 5. Career Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5" /> Career Insights
          </CardTitle>
          <CardDescription>Pattern-matched against your inputs.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {insights.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm rounded-md border p-2.5 bg-muted/30"
              >
                <span className="mt-0.5 size-5 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border p-3 flex items-center gap-3 bg-muted/30">
      <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className="text-lg font-bold truncate">{value}</div>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onCommit: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        defaultValue={value}
        placeholder={placeholder}
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v !== value) {
            onCommit(v);
            toast.success(`${label} saved`);
          }
        }}
      />
    </div>
  );
}

function NumField({
  label,
  value,
  onCommit,
  min = 0,
  max = 100_000,
  readOnly = false,
  syncedFrom,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  readOnly?: boolean;
  syncedFrom?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 min-h-[1.25rem]">
        <Label className="truncate">{label}</Label>
        {syncedFrom && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
            {syncedFrom}
          </span>
        )}
      </div>
      <Input
        type="number"
        min={min}
        max={max}
        step={1}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : 0}
        defaultValue={value}
        key={`${value}-${readOnly}`}
        className={cn(readOnly && "bg-muted/40 cursor-default")}
        onBlur={(e) => {
          if (readOnly) return;
          const n = parseInt(e.target.value, 10);
          const safe = Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
          if (safe !== value) {
            onCommit(safe);
            toast.success(`${label} saved`);
          }
        }}
      />
    </div>
  );
}

function SyncedAt({
  meta,
}: {
  meta: Partial<Record<SyncPlatform, number>>;
}) {
  const latest = Math.max(
    meta.leetcode ?? 0,
    meta.codeforces ?? 0,
    meta.github ?? 0,
  );
  if (!latest) {
    return <span className="text-muted-foreground">Not synced yet.</span>;
  }
  const mins = Math.round((Date.now() - latest) / 60_000);
  const rel =
    mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
  return <span className="text-muted-foreground">Last sync: {rel}</span>;
}

function labelFor(p: SyncPlatform): string {
  if (p === "leetcode") return "LeetCode";
  if (p === "codeforces") return "Codeforces";
  return "GitHub";
}


function TrackerCard({
  title,
  icon: Icon,
  score,
  max = 100,
  tone,
  caption,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  score: number;
  max?: number;
  tone: "indigo" | "emerald" | "amber";
  caption: string;
}) {
  const toneClass = {
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  }[tone];
  const pct = Math.round((score / max) * 100);
  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("size-9 rounded-lg flex items-center justify-center", toneClass)}>
              <Icon className="size-4" />
            </div>
            <div className="font-medium">{title}</div>
          </div>
          <div className="text-right tabular-nums">
            <div className="text-2xl font-bold leading-none">{score}</div>
            <div className="text-xs text-muted-foreground mt-0.5">/ {max}</div>
          </div>
        </div>
        <Progress value={pct} />
        <p className="text-xs text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  );
}
