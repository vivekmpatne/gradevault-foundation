import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Award,
  RefreshCcw,
  Trophy,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  type CodeforcesStats,
  type LeetCodeStats,
  computeDsaReadiness,
  dsaTier,
  fetchCodeforces,
  fetchLeetCode,
  isFresh,
  loadCachedCodeforces,
  loadCachedLeetCode,
} from "@/lib/dsa-client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  leetcodeUsername: string;
  codeforcesHandle: string;
};

export function DsaAnalyticsPanel({ leetcodeUsername, codeforcesHandle }: Props) {
  const [lc, setLc] = useState<LeetCodeStats | null>(() =>
    loadCachedLeetCode(leetcodeUsername),
  );
  const [cf, setCf] = useState<CodeforcesStats | null>(() =>
    loadCachedCodeforces(codeforcesHandle),
  );
  const [loading, setLoading] = useState(false);
  const [lcError, setLcError] = useState<string | null>(null);
  const [cfError, setCfError] = useState<string | null>(null);

  const refresh = useCallback(
    async (force = false) => {
      setLoading(true);
      setLcError(null);
      setCfError(null);
      const tasks: Promise<void>[] = [];

      if (leetcodeUsername) {
        const cached = loadCachedLeetCode(leetcodeUsername);
        if (!force && isFresh(cached)) {
          setLc(cached);
        } else {
          tasks.push(
            fetchLeetCode(leetcodeUsername)
              .then(setLc)
              .catch((e: Error) => {
                setLcError(e.message);
                if (cached) setLc(cached);
              }),
          );
        }
      } else {
        setLc(null);
      }

      if (codeforcesHandle) {
        const cached = loadCachedCodeforces(codeforcesHandle);
        if (!force && isFresh(cached)) {
          setCf(cached);
        } else {
          tasks.push(
            fetchCodeforces(codeforcesHandle)
              .then(setCf)
              .catch((e: Error) => {
                setCfError(e.message);
                if (cached) setCf(cached);
              }),
          );
        }
      } else {
        setCf(null);
      }

      await Promise.all(tasks);
      setLoading(false);
    },
    [leetcodeUsername, codeforcesHandle],
  );

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  const readiness = useMemo(() => computeDsaReadiness(lc, cf), [lc, cf]);
  const tier = dsaTier(readiness);

  const toneClass = {
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/30",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30",
  }[tier.tone];

  const hasAny = !!leetcodeUsername || !!codeforcesHandle;

  // Growth chart: cumulative solved estimate from LC + CF contest timeline.
  const growthData = useMemo(() => {
    if (!cf?.history?.length) return [];
    return cf.history.map((h, i) => ({
      idx: i + 1,
      name: new Date(h.time).toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
      }),
      cf: h.rating,
    }));
  }, [cf]);

  const lcGrowth = useMemo(
    () =>
      lc?.history?.map((h, i) => ({
        idx: i + 1,
        name: h.contest.length > 14 ? h.contest.slice(0, 12) + "…" : h.contest,
        lc: h.rating,
      })) ?? [],
    [lc],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5" /> DSA Analytics
          </CardTitle>
          <CardDescription>
            LeetCode + Codeforces snapshot. Cached locally for 30 minutes.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refresh(true)}
          disabled={loading || !hasAny}
        >
          <RefreshCcw className={cn("size-4 mr-1.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {!hasAny && (
          <div className="text-sm text-muted-foreground rounded-md border border-dashed p-4 text-center">
            Add your LeetCode username and Codeforces handle above to unlock analytics.
          </div>
        )}

        {/* Readiness score banner */}
        {hasAny && (
          <div className={cn("rounded-xl border p-4 flex items-center gap-4", toneClass)}>
            <Award className="size-8 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide opacity-80">
                DSA Readiness Score
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold tabular-nums">{readiness}</div>
                <div className="text-sm opacity-80">/ 100</div>
                <Badge variant="outline" className="ml-2 border-current">
                  {tier.label}
                </Badge>
              </div>
              <div className="text-xs mt-1 opacity-90">{tier.blurb}</div>
            </div>
          </div>
        )}

        {/* LeetCode */}
        {leetcodeUsername && (
          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <span className="inline-block size-2 rounded-full bg-amber-500" />
                LeetCode · <span className="text-muted-foreground">{leetcodeUsername}</span>
              </h3>
              {lcError && (
                <Badge variant="destructive" className="text-[10px]">
                  <AlertCircle className="size-3 mr-1" />
                  {lcError}
                </Badge>
              )}
            </header>

            {lc ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  <Stat label="Total Solved" value={lc.totalSolved} />
                  <Stat label="Easy" value={lc.easySolved} tone="emerald" />
                  <Stat label="Medium" value={lc.mediumSolved} tone="amber" />
                  <Stat label="Hard" value={lc.hardSolved} tone="rose" />
                  <Stat
                    label="Contest Rating"
                    value={lc.contestRating ?? "—"}
                  />
                  <Stat label="Contests" value={lc.contestCount ?? "—"} />
                </div>
                {lc.ranking > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Global Ranking: <span className="font-medium text-foreground">#{lc.ranking.toLocaleString()}</span>
                  </div>
                )}
                {/* Difficulty distribution */}
                <DistributionBar
                  segments={[
                    { label: "Easy", value: lc.easySolved, class: "bg-emerald-500" },
                    { label: "Medium", value: lc.mediumSolved, class: "bg-amber-500" },
                    { label: "Hard", value: lc.hardSolved, class: "bg-rose-500" },
                  ]}
                />
              </>
            ) : (
              <div className="text-sm text-muted-foreground rounded-md border p-3">
                {loading ? "Fetching LeetCode stats…" : "No data yet."}
              </div>
            )}
          </section>
        )}

        {/* Codeforces */}
        {codeforcesHandle && (
          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <span className="inline-block size-2 rounded-full bg-sky-500" />
                Codeforces · <span className="text-muted-foreground">{codeforcesHandle}</span>
              </h3>
              {cfError && (
                <Badge variant="destructive" className="text-[10px]">
                  <AlertCircle className="size-3 mr-1" />
                  {cfError}
                </Badge>
              )}
            </header>

            {cf ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Stat label="Current Rating" value={cf.rating || "—"} />
                  <Stat label="Max Rating" value={cf.maxRating || "—"} tone="emerald" />
                  <Stat label="Rank" value={titleCase(cf.rank)} />
                  <Stat label="Contests" value={cf.contestsParticipated} />
                </div>
                <div className="text-xs text-muted-foreground">
                  Peak Rank:{" "}
                  <span className="font-medium text-foreground">{titleCase(cf.maxRank)}</span>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground rounded-md border p-3">
                {loading ? "Fetching Codeforces stats…" : "No data yet."}
              </div>
            )}
          </section>
        )}

        {/* Charts */}
        {(growthData.length > 0 || lcGrowth.length > 0) && (
          <section className="grid lg:grid-cols-2 gap-4">
            {lcGrowth.length > 0 && (
              <ChartFrame
                title="LeetCode Contest Progress"
                icon={<TrendingUp className="size-4" />}
              >
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={lcGrowth} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="lcFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(45 93% 47%)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(45 93% 47%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="idx" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="lc"
                      stroke="hsl(45 93% 47%)"
                      fill="url(#lcFill)"
                      name="Rating"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartFrame>
            )}

            {growthData.length > 0 && (
              <ChartFrame
                title="Codeforces Rating Growth"
                icon={<Trophy className="size-4" />}
              >
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={growthData} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="idx" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cf"
                      stroke="hsl(217 91% 60%)"
                      strokeWidth={2}
                      dot={false}
                      name="Rating"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartFrame>
            )}
          </section>
        )}

        {/* Readiness progress */}
        {hasAny && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Path to Competitive (100)</span>
              <span className="tabular-nums">{readiness}/100</span>
            </div>
            <Progress value={readiness} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function titleCase(s: string) {
  if (!s) return "—";
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "emerald" | "amber" | "rose";
}) {
  const toneClass = tone
    ? {
        emerald: "text-emerald-600 dark:text-emerald-400",
        amber: "text-amber-600 dark:text-amber-400",
        rose: "text-rose-600 dark:text-rose-400",
      }[tone]
    : "text-foreground";
  return (
    <div className="rounded-md border bg-muted/30 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
        {label}
      </div>
      <div className={cn("text-lg font-bold tabular-nums truncate", toneClass)}>
        {value}
      </div>
    </div>
  );
}

function DistributionBar({
  segments,
}: {
  segments: { label: string; value: number; class: string }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="space-y-1.5">
      <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-muted">
        {segments.map((s) => (
          <div
            key={s.label}
            className={s.class}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <div className="flex gap-3 text-[11px] text-muted-foreground flex-wrap">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className={cn("inline-block size-2 rounded-sm", s.class)} />
            {s.label} · <span className="font-medium text-foreground">{s.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ChartFrame({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="flex items-center gap-2 text-sm font-medium mb-2">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
