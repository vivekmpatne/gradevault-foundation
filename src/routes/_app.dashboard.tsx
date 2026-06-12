import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
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
} from "lucide-react";
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
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { useAcademicData } from "@/lib/academic-store";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

const chartConfig = {
  sgpa: {
    label: "SGPA",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

function DashboardPage() {
  const navigate = useNavigate();
  const data = useAcademicData();

  useEffect(() => {
    if (!data.student) navigate({ to: "/" });
  }, [data.student, navigate]);

  if (!data.student) return null;

  const {
    student,
    semesters,
    cgpa,
    latestSgpa,
    totalCredits,
    percentage,
    status,
    hasData,
  } = data;

  const statusToneClass: Record<typeof status.tone, string> = {
    excellent: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    good: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    average: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    low: "bg-destructive/15 text-destructive border-destructive/30",
  };

  const chartData = semesters.map((s) => ({
    semester: `Sem ${s.number}`,
    sgpa: Number(s.sgpa.toFixed(2)),
  }));

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
      hint: hasData
        ? `Semester ${semesters[semesters.length - 1].number}`
        : "No data yet",
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
      value: String(student.profile.currentSemester),
      icon: CalendarDays,
      hint: "Ongoing term",
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
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome, {student.profile.name.split(" ")[0]}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="font-mono">{student.profile.usn}</span>
          <span className="hidden sm:inline">•</span>
          <span>{student.profile.branch}</span>
          <span className="hidden sm:inline">•</span>
          <span>Semester {student.profile.currentSemester}</span>
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
              value={`Sem ${student.profile.currentSemester}`}
            />
            <ProfileField
              label="Semesters Completed"
              value={String(semesters.length)}
            />
            <ProfileField
              label="Current CGPA"
              value={hasData ? cgpa.toFixed(2) : "—"}
            />
          </dl>
        </CardContent>
      </Card>

      {!hasData ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center gap-4">
            <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
              <BookOpen className="size-7 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">No academic records found.</p>
              <p className="text-sm text-muted-foreground">
                Add your semester data from the Calculator tab to see your
                stats and trend.
              </p>
            </div>
            <Button asChild>
              <Link to="/calculator">
                <CalculatorIcon className="size-4" />
                Go to Calculator
              </Link>
            </Button>
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
            <CardHeader>
              <div className="flex items-center gap-2">
                <LineChartIcon className="size-4 text-muted-foreground" />
                <CardTitle>SGPA Trend</CardTitle>
              </div>
              <CardDescription>
                Semester-wise SGPA across completed terms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfig}
                className="h-[280px] w-full"
              >
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
                  <Line
                    type="monotone"
                    dataKey="sgpa"
                    stroke="var(--color-sgpa)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
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
