import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  BookOpen,
  Briefcase,
  ArrowUp,
  ArrowDown,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStudent } from "@/lib/student-store";
import { gradePointFromMarks } from "@/lib/calculator-storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/suggestions")({
  component: SuggestionsPage,
});

type Tone = "good" | "warn" | "bad";

const TOTAL_SEMESTERS = 8;

function toneClass(t: Tone) {
  if (t === "good")
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  if (t === "warn")
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
  return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
}

function SuggestionsPage() {
  const { academic, settings } = useStudent();
  const completed = academic.semesters.filter((s) => s.completed);
  const latest = completed[completed.length - 1];
  const previous = completed[completed.length - 2];

  // 1. Performance trend
  const trend: { label: string; tone: Tone; icon: typeof TrendingUp } =
    useMemo(() => {
      if (!latest || !previous)
        return { label: "Stable", tone: "warn", icon: Minus };
      const delta = latest.sgpa - previous.sgpa;
      if (delta > 0.1)
        return { label: "Improving", tone: "good", icon: TrendingUp };
      if (delta < -0.1)
        return { label: "Declining", tone: "bad", icon: TrendingDown };
      return { label: "Stable", tone: "warn", icon: Minus };
    }, [latest, previous]);

  // 2. Target analysis — required SGPA across remaining semesters.
  const remaining = Math.max(0, TOTAL_SEMESTERS - completed.length);
  const avgCreditsPerSem =
    completed.length > 0
      ? completed.reduce((a, s) => a + s.credits, 0) / completed.length
      : 22;
  const earnedPoints = completed.reduce((a, s) => a + s.sgpa * s.credits, 0);
  const earnedCredits = completed.reduce((a, s) => a + s.credits, 0);
  const projectedRemainingCredits = remaining * avgCreditsPerSem;
  const totalProjectedCredits = earnedCredits + projectedRemainingCredits;
  const requiredSgpa =
    remaining > 0 && projectedRemainingCredits > 0
      ? (settings.targetCGPA * totalProjectedCredits - earnedPoints) /
        projectedRemainingCredits
      : 0;
  const targetVerdict: { label: string; tone: Tone } =
    remaining === 0
      ? academic.cgpa >= settings.targetCGPA
        ? { label: "Achieved", tone: "good" }
        : { label: "Missed", tone: "bad" }
      : requiredSgpa <= 0
        ? { label: "Achieved", tone: "good" }
        : requiredSgpa <= 8.5
          ? { label: "Achievable", tone: "good" }
          : requiredSgpa <= 9.5
            ? { label: "Challenging", tone: "warn" }
            : { label: "Difficult", tone: "bad" };

  // 4. Subject-wise analysis
  const subjectAgg = new Map<string, { gp: number; n: number }>();
  completed.forEach((sem) =>
    sem.subjects.forEach((s) => {
      const key = s.name.trim() || "Untitled";
      const gp = gradePointFromMarks(s.marks || 0);
      const cur = subjectAgg.get(key) ?? { gp: 0, n: 0 };
      cur.gp += gp;
      cur.n += 1;
      subjectAgg.set(key, cur);
    }),
  );
  const ranked = [...subjectAgg.entries()]
    .map(([name, v]) => ({ name, avg: v.gp / v.n }))
    .sort((a, b) => b.avg - a.avg);
  const strong = ranked.filter((s) => s.avg >= 8).slice(0, 5);
  const weak = ranked
    .filter((s) => s.avg < 7)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 5);

  // 5. Career readiness
  const cgpaScore = Math.min(40, (academic.cgpa / 10) * 40);
  const lcScore = Math.min(20, (settings.leetcode / 2000) * 20);
  const cfScore = Math.min(15, (settings.codeforces / 1800) * 15);
  const projScore = Math.min(25, (settings.projects / 5) * 25);
  const readiness = Math.round(cgpaScore + lcScore + cfScore + projScore);
  const readinessTone: Tone =
    readiness >= 71 ? "good" : readiness >= 41 ? "warn" : "bad";
  const readinessLabel =
    readiness >= 71
      ? "Placement Ready"
      : readiness >= 41
        ? "Good Progress"
        : "Needs Work";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Lightbulb className="size-7" /> Suggestions
        </h1>
        <p className="text-muted-foreground mt-1">
          Personalized insights for {academic.student?.profile.name ?? "you"}.
        </p>
      </div>

      {/* 1. Performance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5" /> Performance Analysis
          </CardTitle>
          <CardDescription>
            Where you stand right now vs. your last semester.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          <Stat label="Current CGPA" value={academic.cgpa.toFixed(2)} />
          <Stat
            label="Previous SGPA"
            value={previous ? previous.sgpa.toFixed(2) : "—"}
          />
          <Stat
            label="Trend"
            value={
              <Badge variant="outline" className={cn("gap-1", toneClass(trend.tone))}>
                <trend.icon className="size-3.5" />
                {trend.label}
              </Badge>
            }
          />
        </CardContent>
      </Card>

      {/* 2. Target CGPA Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-5" /> Target CGPA Analysis
          </CardTitle>
          <CardDescription>
            Path to your target of {settings.targetCGPA.toFixed(1)} CGPA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <Stat label="Target CGPA" value={settings.targetCGPA.toFixed(2)} />
            <Stat
              label="Semesters Left"
              value={String(remaining)}
            />
            <Stat
              label="Required SGPA"
              value={
                remaining === 0
                  ? "—"
                  : requiredSgpa <= 0
                    ? "Any"
                    : Math.min(10, requiredSgpa).toFixed(2)
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm text-muted-foreground">Verdict</span>
            <Badge variant="outline" className={toneClass(targetVerdict.tone)}>
              {targetVerdict.label}
            </Badge>
          </div>
          {remaining > 0 && requiredSgpa > 10 && (
            <p className="text-xs text-muted-foreground">
              Target unreachable with remaining credits — consider revising your
              target.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 3. Semester Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5" /> Semester Trend
          </CardTitle>
          <CardDescription>
            SGPA shift across each completed semester.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No semesters completed yet.
            </p>
          ) : (
            <ul className="divide-y">
              {completed.map((s, i) => {
                const prev = completed[i - 1];
                const delta = prev ? s.sgpa - prev.sgpa : 0;
                const tone: Tone =
                  !prev
                    ? "warn"
                    : delta > 0.1
                      ? "good"
                      : delta < -0.1
                        ? "bad"
                        : "warn";
                return (
                  <li
                    key={s.number}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <span className="font-medium">Semester {s.number}</span>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums">{s.sgpa.toFixed(2)}</span>
                      {prev && (
                        <Badge
                          variant="outline"
                          className={cn("gap-1 tabular-nums", toneClass(tone))}
                        >
                          {delta > 0 ? (
                            <ArrowUp className="size-3" />
                          ) : delta < 0 ? (
                            <ArrowDown className="size-3" />
                          ) : (
                            <Minus className="size-3" />
                          )}
                          {Math.abs(delta).toFixed(2)}
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 4. Subject-wise Analysis */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-5" /> Strong Subjects
            </CardTitle>
            <CardDescription>Average grade point ≥ 8.</CardDescription>
          </CardHeader>
          <CardContent>
            {strong.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keep building — no standout subjects yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {strong.map((s) => (
                  <li
                    key={s.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate pr-2">{s.name}</span>
                    <Badge variant="outline" className={toneClass("good")}>
                      {s.avg.toFixed(1)} GP
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-5" /> Improvement Areas
            </CardTitle>
            <CardDescription>Average grade point &lt; 7.</CardDescription>
          </CardHeader>
          <CardContent>
            {weak.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing critical — every subject is above the bar.
              </p>
            ) : (
              <ul className="space-y-2">
                {weak.map((s) => (
                  <li
                    key={s.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate pr-2">{s.name}</span>
                    <Badge
                      variant="outline"
                      className={toneClass(s.avg < 5 ? "bad" : "warn")}
                    >
                      {s.avg.toFixed(1)} GP
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Career Readiness */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="size-5" /> Career Readiness
            </CardTitle>
            <CardDescription className="mt-1">
              Weighted assessment of academic performance and technical profiles.
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-secondary">
                  <Info className="size-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-center p-3">
                Increase projects and coding ratings to improve readiness score.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            {/* Left Column: Summary Circle / Progress */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center size-24 rounded-full border-4 border-muted">
                  <div className="absolute text-2xl font-bold tabular-nums">
                    {readiness}%
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Total Readiness</div>
                  <Badge
                    variant="outline"
                    className={cn("text-sm px-2.5 py-0.5 font-semibold", toneClass(readinessTone))}
                  >
                    {readinessLabel}
                  </Badge>
                </div>
              </div>

              {/* Status Ranges Legend */}
              <div className="space-y-2 border-t pt-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status Scale</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex flex-col items-center p-1.5 rounded bg-red-500/5 border border-red-500/10 text-red-600 dark:text-red-400">
                    <span className="font-bold">0-40</span>
                    <span className="text-[10px]">Needs Work</span>
                  </div>
                  <div className="flex flex-col items-center p-1.5 rounded bg-amber-500/5 border border-amber-500/10 text-amber-600 dark:text-amber-400">
                    <span className="font-bold">41-70</span>
                    <span className="text-[10px]">Good Progress</span>
                  </div>
                  <div className="flex flex-col items-center p-1.5 rounded bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <span className="font-bold">71-100</span>
                    <span className="text-[10px]">Placement Ready</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Scoring Breakdown */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Scoring Breakdown</h3>
              <div className="space-y-3.5">
                {/* CGPA Score */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm font-medium">
                    <span>CGPA Score</span>
                    <span className="tabular-nums font-semibold">{cgpaScore.toFixed(0)}/40</span>
                  </div>
                  <Progress value={(cgpaScore / 40) * 100} className="h-1.5" />
                </div>

                {/* LeetCode Score */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm font-medium">
                    <span>LeetCode Score</span>
                    <span className="tabular-nums font-semibold">{lcScore.toFixed(0)}/20</span>
                  </div>
                  <Progress value={(lcScore / 20) * 100} className="h-1.5" />
                </div>

                {/* Codeforces Score */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Codeforces Score</span>
                    <span className="tabular-nums font-semibold">{cfScore.toFixed(0)}/15</span>
                  </div>
                  <Progress value={(cfScore / 15) * 100} className="h-1.5" />
                </div>

                {/* Projects Score */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Projects Score</span>
                    <span className="tabular-nums font-semibold">{projScore.toFixed(0)}/25</span>
                  </div>
                  <Progress value={(projScore / 25) * 100} className="h-1.5" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground flex gap-2 items-start border">
            <Info className="size-4 shrink-0 text-muted-foreground mt-0.5" />
            <span>Increase projects and coding ratings to improve readiness score.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}
