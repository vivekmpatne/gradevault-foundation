import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import {
  GraduationCap,
  TrendingUp,
  Award,
  Percent,
  CalendarDays,
  Sparkles,
  BookOpen,
  IdCard,
  LineChart as LineChartIcon,
  Calculator as CalculatorIcon,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Download,
} from "lucide-react";
import { exportDashboardPdf } from "@/lib/pdf-export";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { useStudent } from "@/lib/student-store";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

const chartConfig = {
  sgpa: { label: "SGPA", color: "hsl(var(--primary))" },
  projected: { label: "Projection", color: "hsl(var(--muted-foreground))" },
} satisfies ChartConfig;

function sgpaColor(v: number): string {
  if (v >= 9) return "#10B981";
  if (v >= 8) return "#2563EB";
  if (v >= 7) return "#F59E0B";
  return "#EF4444";
}

function DashboardPage() {
  const navigate = useNavigate();
  const { academic: data, settings, profileCompletion } = useStudent();
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (!data.student) navigate({ to: "/" });
    const t = setTimeout(() => setBootstrapped(true), 250);
    return () => clearTimeout(t);
  }, [data.student, navigate]);

  if (!data.student) return null;
  if (!bootstrapped) return <DashboardSkeleton />;

  const {
    student,
    semesters,
    cgpa,
    latestSgpa,
    totalCredits,
    percentage,
    status,
    hasData,
    completedSemesters,
    currentSemester,
    latestSemesterNumber,
  } = data;

  const statusToneClass: Record<typeof status.tone, string> = {
    excellent: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    good: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    average: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    low: "bg-destructive/15 text-destructive border-destructive/30",
  };

  const completed = semesters.filter((s) => s.completed);
  const lastCompletedNum = completed.length
    ? completed[completed.length - 1].number
    : 0;
  const projectedY = completed.length
    ? Number(completed[completed.length - 1].sgpa.toFixed(2))
    : null;

  // Build a continuous 1..8 timeline so projection lines render past the last
  // completed semester.
  const chartData = Array.from({ length: 8 }, (_, i) => {
    const num = i + 1;
    const sem = semesters.find((s) => s.number === num);
    const sgpa =
      sem && sem.completed ? Number(sem.sgpa.toFixed(2)) : null;
    let projected: number | null = null;
    if (projectedY !== null && num >= lastCompletedNum && num <= 8) {
      projected = projectedY;
    }
    return { semester: `Sem ${num}`, sgpa, projected };
  });

  // Trend: compare last two completed SGPAs.
  let trend: "improving" | "stable" | "declining" = "stable";
  if (completed.length >= 2) {
    const diff =
      completed[completed.length - 1].sgpa -
      completed[completed.length - 2].sgpa;
    if (diff > 0.1) trend = "improving";
    else if (diff < -0.1) trend = "declining";
  }
  const trendMeta = {
    improving: {
      label: "Improving",
      Icon: ArrowUpRight,
      cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    },
    stable: {
      label: "Stable",
      Icon: ArrowRight,
      cls: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    },
    declining: {
      label: "Declining",
      Icon: ArrowDownRight,
      cls: "bg-destructive/15 text-destructive border-destructive/30",
    },
  }[trend];

  const stats = [
    {
      label: "Current CGPA",
      value: hasData ? cgpa.toFixed(2) : "—",
      icon: TrendingUp,
      hint: "Cumulative across semesters",
    },
    {
      label: "Latest SGPA",
      value: hasData ? latestSgpa.toFixed(2) : "—",
      icon: Sparkles,
      hint: hasData ? `Semester ${latestSemesterNumber}` : "No data yet",
    },
    {
      label: "Credits Completed",
      value: hasData ? String(totalCredits) : "—",
      icon: Award,
      hint: "Total earned credits",
    },
    {
      label: "Equivalent %",
      value: hasData ? `${percentage.toFixed(2)}%` : "—",
      icon: Percent,
      hint: "(CGPA − 0.75) × 10",
    },
    {
      label: "Current Semester",
      value: String(currentSemester),
      icon: CalendarDays,
      hint: `${completedSemesters} completed`,
    },
    {
      label: "Academic Status",
      value: hasData ? status.label : "—",
      icon: GraduationCap,
      hint: hasData ? `Based on ${cgpa.toFixed(2)} CGPA` : "Awaiting data",
      tone: hasData ? status.tone : undefined,
    },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex flex-col gap-2 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome, {student.profile.name.split(" ")[0]}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="font-mono">{student.profile.usn}</span>
            <span className="hidden sm:inline">•</span>
            <span>{student.profile.branch}</span>
            <span className="hidden sm:inline">•</span>
            <span>Semester {currentSemester}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/profile-share">
              <Sparkles className="size-4" />
              Share Profile
            </Link>
          </Button>
          <Button
            onClick={() => exportDashboardPdf(data, settings)}
            className="gap-2"
          >
            <Download className="size-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <IdCard className="size-6" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl">{student.profile.name}</CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              {student.profile.usn}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <ProfileField label="Branch" value={student.profile.branch} />
            <ProfileField
              label="Current Semester"
              value={`Sem ${currentSemester}`}
            />
            <ProfileField
              label="Semesters Completed"
              value={String(completedSemesters)}
            />
            <ProfileField
              label="Current CGPA"
              value={hasData ? cgpa.toFixed(2) : "—"}
            />
          </dl>
        </CardContent>
      </Card>

      {/* Goals (from Settings) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Goals</CardTitle>
          <CardDescription>
            Update these in Settings to keep your dashboard aligned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <ProfileField
              label="Target CGPA"
              value={settings.targetCGPA.toFixed(2)}
            />
            <ProfileField
              label="Prep Track"
              value={prepTrackLabel(settings.prepTrack)}
            />
            <ProfileField
              label="Career Goal"
              value={settings.careerGoal || "—"}
            />
          </dl>
          {hasData && (
            <div className="mt-3 text-xs text-muted-foreground">
              {cgpa >= settings.targetCGPA
                ? `On track — current CGPA ${cgpa.toFixed(2)} meets your target.`
                : `Gap of ${(settings.targetCGPA - cgpa).toFixed(2)} CGPA to reach your target.`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Completion */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Profile Completion</CardTitle>
            <CardDescription className="mt-1">
              {profileCompletion.total >= 80
                ? "Your profile looks great."
                : "Fill in the missing details for sharper recommendations."}
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono">
            {profileCompletion.total}%
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={profileCompletion.total} />
          {profileCompletion.total < 100 && profileCompletion.missing.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profileCompletion.missing.slice(0, 5).map((m) => (
                <Badge key={m} variant="secondary" className="text-xs font-normal">
                  {m}
                </Badge>
              ))}
              {profileCompletion.missing.length > 5 && (
                <Badge variant="secondary" className="text-xs font-normal">
                  +{profileCompletion.missing.length - 5} more
                </Badge>
              )}
            </div>
          )}
          {profileCompletion.total < 80 && (
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/settings">
                Complete profile
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>




      {!hasData ? (
        <Card>
          <CardContent className="py-10 space-y-6">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
                <BookOpen className="size-7 text-muted-foreground" />
              </div>
              <p className="font-medium">No semester data yet</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Start by adding your first semester, calculating an SGPA, or
                setting a target CGPA. Everything updates automatically.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Button asChild variant="outline" className="h-auto py-4 flex-col gap-1">
                <Link to="/calculator">
                  <CalculatorIcon className="size-5" />
                  <span className="font-medium">Add Semester {currentSemester}</span>
                  <span className="text-xs text-muted-foreground">Enter subjects & marks</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-4 flex-col gap-1">
                <Link to="/calculator">
                  <Sparkles className="size-5" />
                  <span className="font-medium">Use Calculator</span>
                  <span className="text-xs text-muted-foreground">Quick SGPA / CGPA</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-4 flex-col gap-1">
                <Link to="/settings">
                  <TrendingUp className="size-5" />
                  <span className="font-medium">Set Target CGPA</span>
                  <span className="text-xs text-muted-foreground">Goal-based tracking</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((s) => (
              <Card key={s.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {s.label}
                  </CardTitle>
                  <s.icon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {"tone" in s && s.tone ? (
                    <Badge
                      variant="outline"
                      className={statusToneClass[s.tone]}
                    >
                      {s.value}
                    </Badge>
                  ) : (
                    <div className="text-2xl font-bold tracking-tight">
                      {s.value}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{s.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <div className="flex items-center gap-2">
                  <LineChartIcon className="size-4 text-muted-foreground" />
                  <CardTitle>SGPA Trend</CardTitle>
                </div>
                <CardDescription className="mt-1">
                  Semester-wise SGPA across completed terms.
                </CardDescription>
              </div>
              {completed.length >= 2 && (
                <Badge
                  variant="outline"
                  className={`${trendMeta.cls} gap-1`}
                >
                  <trendMeta.Icon className="size-3.5" />
                  {trendMeta.label}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfig}
                className="h-[300px] sm:h-[340px] w-full"
              >
                <LineChart
                  data={chartData}
                  margin={{ top: 24, right: 24, bottom: 8, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="semester"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={32}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {/* Future projection — dashed grey line */}
                  <Line
                    type="monotone"
                    dataKey="projected"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    strokeDasharray="6 6"
                    dot={false}
                    activeDot={false}
                    connectNulls
                    isAnimationActive
                    animationDuration={900}
                  />
                  {/* Actual SGPA — colored dots per threshold */}
                  <Line
                    type="monotone"
                    dataKey="sgpa"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    connectNulls
                    isAnimationActive
                    animationDuration={900}
                    dot={(props) => {
                      const { cx, cy, payload, index } = props;
                      if (
                        cx == null ||
                        cy == null ||
                        payload?.sgpa == null
                      )
                        return <g key={`d-${index}`} />;
                      return (
                        <circle
                          key={`d-${index}`}
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill={sgpaColor(payload.sgpa)}
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 7 }}
                  >
                    <LabelList
                      dataKey="sgpa"
                      position="top"
                      offset={10}
                      className="fill-foreground text-[11px] font-medium"
                      formatter={(v: number | null) =>
                        v == null ? "" : v.toFixed(2)
                      }
                    />
                  </Line>
                </LineChart>
              </ChartContainer>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <LegendDot color="#10B981" label="≥ 9.0" />
                <LegendDot color="#2563EB" label="8.0 – 8.99" />
                <LegendDot color="#F59E0B" label="7.0 – 7.99" />
                <LegendDot color="#EF4444" label="< 7.0" />
                <LegendDot color="hsl(var(--muted-foreground))" label="Projection" dashed />
              </div>
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-muted-foreground" />
                <CardTitle>Semester Overview</CardTitle>
              </div>
              <CardDescription>
                All semesters with SGPA and credits earned.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semester</TableHead>
                    <TableHead>SGPA</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {semesters.map((sem) => (
                    <TableRow key={sem.number}>
                      <TableCell className="font-medium">
                        Semester {sem.number}
                      </TableCell>
                      <TableCell>{sem.sgpa.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {sem.credits}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </dt>
      <dd className="font-medium mt-1">{value}</dd>
    </div>
  );
}

function LegendDot({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {dashed ? (
        <span
          className="inline-block w-4 border-t-2 border-dashed"
          style={{ borderColor: color }}
        />
      ) : (
        <span
          className="inline-block size-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </span>
  );
}

function prepTrackLabel(t: string): string {
  if (t === "on-campus") return "On-Campus Placement";
  if (t === "off-campus") return "Off-Campus Placement";
  if (t === "higher-studies") return "Higher Studies";
  return "—";
}
