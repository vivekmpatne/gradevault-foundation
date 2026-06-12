import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  GraduationCap,
  TrendingUp,
  Award,
  Percent,
  CalendarDays,
  Sparkles,
  BookOpen,
  IdCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getCurrentStudent,
  computeCGPA,
  totalCredits,
  latestSGPA,
  cgpaToPercentage,
  academicStatus,
  type Student,
} from "@/lib/auth";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    const s = getCurrentStudent();
    if (!s) {
      navigate({ to: "/" });
      return;
    }
    setStudent(s);
  }, [navigate]);

  if (!student) return null;

  const cgpa = computeCGPA(student.semesters);
  const sgpa = latestSGPA(student.semesters);
  const credits = totalCredits(student.semesters);
  const percentage = cgpaToPercentage(cgpa);
  const status = academicStatus(cgpa);
  const completed = student.semesters.length;

  const statusToneClass: Record<typeof status.tone, string> = {
    excellent: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    good: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    average: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    low: "bg-destructive/15 text-destructive border-destructive/30",
  };

  const stats = [
    {
      label: "Current CGPA",
      value: cgpa.toFixed(2),
      icon: TrendingUp,
      hint: "Cumulative across semesters",
    },
    {
      label: "Latest SGPA",
      value: sgpa.toFixed(2),
      icon: Sparkles,
      hint: `Semester ${student.semesters.length}`,
    },
    {
      label: "Credits Completed",
      value: String(credits),
      icon: Award,
      hint: "Total earned credits",
    },
    {
      label: "Equivalent %",
      value: `${percentage.toFixed(2)}%`,
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
      value: status.label,
      icon: GraduationCap,
      hint: `Based on ${cgpa.toFixed(2)} CGPA`,
      tone: status.tone,
    },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {student.profile.name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's a snapshot of your academic performance.
        </p>
      </div>

      {/* Profile Card */}
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
              value={String(completed)}
            />
            <ProfileField label="Current CGPA" value={cgpa.toFixed(2)} />
          </dl>
        </CardContent>
      </Card>

      {/* Stat cards */}
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
              {"tone" in s ? (
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

      {/* Semester Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-muted-foreground" />
            <CardTitle>Semester Overview</CardTitle>
          </div>
          <CardDescription>
            All completed semesters with SGPA and credits earned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {student.semesters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed semesters yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Semester</TableHead>
                  <TableHead>SGPA</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...student.semesters]
                  .sort((a, b) => a.number - b.number)
                  .map((sem) => (
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
          )}
        </CardContent>
      </Card>
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
