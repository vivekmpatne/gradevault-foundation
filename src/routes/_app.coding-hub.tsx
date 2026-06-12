import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
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
import {
  loadSettings,
  saveSettings,
  useSettings,
} from "@/lib/settings-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/coding-hub")({
  component: CodingHubPage,
});

function CodingHubPage() {
  const { settings } = useSettings();

  const update = <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K],
  ) => {
    const next = { ...loadSettings(), [key]: value };
    saveSettings(next);
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



      {/* 2. Coding Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="size-5" /> Coding Progress
          </CardTitle>
          <CardDescription>
            Update manually for now — auto-sync coming soon.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <NumField
            label="Total Problems Solved"
            value={settings.totalProblemsSolved}
            onCommit={(v) => update("totalProblemsSolved", v)}
          />
          <NumField
            label="LeetCode Rating"
            value={settings.leetcode}
            onCommit={(v) => update("leetcode", v)}
          />
          <NumField
            label="Codeforces Rating"
            value={settings.codeforces}
            onCommit={(v) => update("codeforces", v)}
          />
          <NumField
            label="Contest Count"
            value={settings.contestCount}
            onCommit={(v) => update("contestCount", v)}
          />
          <NumField
            label="Current Streak (days)"
            value={settings.currentStreak}
            onCommit={(v) => update("currentStreak", v)}
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
          />
          <NumField
            label="GitHub Repositories"
            value={settings.githubRepos}
            onCommit={(v) => update("githubRepos", v)}
          />
          <NumField
            label="Open-Source Contributions"
            value={settings.openSourceContributions}
            onCommit={(v) => update("openSourceContributions", v)}
          />
          <NumField
            label="Active Development Days"
            value={settings.activeDevDays}
            onCommit={(v) => update("activeDevDays", v)}
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
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        min={0}
        defaultValue={value}
        onBlur={(e) => {
          const n = parseInt(e.target.value, 10);
          const safe = Number.isFinite(n) && n >= 0 ? n : 0;
          if (safe !== value) {
            onCommit(safe);
            toast.success(`${label} saved`);
          }
        }}
      />
    </div>
  );
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
