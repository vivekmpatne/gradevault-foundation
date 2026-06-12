import { useEffect, useMemo, useState } from "react";
import {
  Github,
  RefreshCw,
  Star,
  GitFork,
  Users,
  UserPlus,
  Folder,
  Activity,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchGitHubProfile,
  isCacheFresh,
  loadCachedProfile,
  portfolioStrengthLabel,
  type GitHubProfile,
} from "@/lib/github-client";
import { cn } from "@/lib/utils";

const LANG_COLOR: Record<string, string> = {
  TypeScript: "bg-blue-500",
  JavaScript: "bg-yellow-400",
  Python: "bg-emerald-500",
  Java: "bg-orange-500",
  "C++": "bg-pink-500",
  C: "bg-slate-500",
  Go: "bg-cyan-500",
  Rust: "bg-amber-600",
  HTML: "bg-orange-400",
  CSS: "bg-violet-500",
  Shell: "bg-lime-500",
};

const TONE: Record<"good" | "ok" | "warn" | "bad", string> = {
  good: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  ok: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  bad: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
};

export function GithubIntegrationPanel({ username }: { username: string }) {
  const trimmed = username.trim();
  const [profile, setProfile] = useState<GitHubProfile | null>(() =>
    trimmed ? loadCachedProfile(trimmed) : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (force = false) => {
    if (!trimmed) return;
    const cached = loadCachedProfile(trimmed);
    if (!force && isCacheFresh(cached)) {
      setProfile(cached);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await fetchGitHubProfile(trimmed);
      setProfile(next);
      if (force) toast.success("GitHub stats refreshed");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch GitHub data";
      setError(msg);
      const cached = loadCachedProfile(trimmed);
      if (cached) setProfile(cached);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Sync to cache when username changes; auto-fetch if no fresh cache.
    if (!trimmed) {
      setProfile(null);
      setError(null);
      return;
    }
    const cached = loadCachedProfile(trimmed);
    setProfile(cached);
    if (!isCacheFresh(cached)) void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed]);

  const strength = useMemo(
    () => (profile ? portfolioStrengthLabel(profile.healthScore) : null),
    [profile],
  );

  if (!trimmed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="size-5" /> GitHub Integration
          </CardTitle>
          <CardDescription>
            Add your GitHub username above to pull live stats.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {profile?.user.avatarUrl ? (
            <img
              src={profile.user.avatarUrl}
              alt={profile.user.login}
              className="size-12 rounded-full border shrink-0"
            />
          ) : (
            <div className="size-12 rounded-full border bg-muted flex items-center justify-center shrink-0">
              <Github className="size-5" />
            </div>
          )}
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <Github className="size-5" />
              {profile?.user.name || trimmed}
              <a
                href={profile?.user.htmlUrl ?? `https://github.com/${trimmed}`}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-3.5" />
              </a>
            </CardTitle>
            <CardDescription className="truncate">
              @{profile?.user.login ?? trimmed}
              {profile?.user.bio ? ` · ${profile.user.bio}` : ""}
            </CardDescription>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => load(true)}
          disabled={loading}
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        {error && !profile && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 text-destructive p-3 text-sm">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!profile && loading ? (
          <SkeletonLoader />
        ) : profile ? (
          <>
            {error && (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                Showing cached data — {error}
              </div>
            )}

            {/* Stat grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat icon={Folder} label="Public Repos" value={profile.user.publicRepos} />
              <Stat icon={Users} label="Followers" value={profile.user.followers} />
              <Stat icon={UserPlus} label="Following" value={profile.user.following} />
              <Stat icon={Star} label="Stars Earned" value={profile.totalStars} />
            </div>

            {/* Health score */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles className="size-4 text-primary" /> GitHub Health Score
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Active repos, recent pushes, and language diversity.
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold tabular-nums">{profile.healthScore}</div>
                  {strength && (
                    <Badge variant="outline" className={cn(TONE[strength.tone])}>
                      {strength.label}
                    </Badge>
                  )}
                </div>
              </div>
              <Progress value={profile.healthScore} />
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <MiniStat label="Active (90d)" value={profile.activeRepoCount} />
                <MiniStat label="Pushed (30d)" value={profile.recentPushCount} />
                <MiniStat label="Languages" value={profile.distinctLanguages} />
              </div>
            </div>

            {/* Top languages */}
            {profile.topLanguages.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  <Activity className="size-4" /> Top Languages
                </div>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  {profile.topLanguages.map((l) => (
                    <div
                      key={l.name}
                      className={cn("h-full", LANG_COLOR[l.name] ?? "bg-primary")}
                      style={{ width: `${l.pct}%` }}
                      title={`${l.name} · ${l.pct}%`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.topLanguages.map((l) => (
                    <span
                      key={l.name}
                      className="inline-flex items-center gap-1.5 text-xs rounded-md border px-2 py-0.5"
                    >
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          LANG_COLOR[l.name] ?? "bg-primary",
                        )}
                      />
                      {l.name}
                      <span className="text-muted-foreground">{l.pct}%</span>
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Based on the primary language of each public repo. GitHub does not
                  expose per-user contribution graphs via the public API.
                </p>
              </div>
            )}

            {/* Recent repos */}
            <div className="space-y-2">
              <div className="text-sm font-semibold flex items-center gap-1.5">
                <Folder className="size-4" /> Recent Repositories
              </div>
              {profile.recentRepos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No public repos yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {profile.recentRepos.map((r) => (
                    <a
                      key={r.id}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border p-3 hover:bg-muted/40 transition-colors space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm truncate">{r.name}</span>
                        <ExternalLink className="size-3.5 text-muted-foreground shrink-0" />
                      </div>
                      {r.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {r.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {r.language && (
                          <span className="inline-flex items-center gap-1">
                            <span
                              className={cn(
                                "size-2 rounded-full",
                                LANG_COLOR[r.language] ?? "bg-primary",
                              )}
                            />
                            {r.language}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Star className="size-3" />
                          {r.stars}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <GitFork className="size-3" />
                          {r.forks}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground">
              Cached locally · last updated{" "}
              {new Date(profile.fetchedAt).toLocaleString()}.
            </p>
          </>
        ) : (
          <SkeletonLoader />
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border p-3 flex items-center gap-3 bg-muted/30">
      <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className="text-lg font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-2 text-center bg-muted/30">
      <div className="text-base font-semibold tabular-nums text-foreground">{value}</div>
      <div className="text-[11px]">{label}</div>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-32" />
    </div>
  );
}
