import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { History as HistoryIcon, Trash2, BookOpen, Calculator as CalculatorIcon } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteSemester,
  useAcademicData,
} from "@/lib/academic-store";

export const Route = createFileRoute("/_app/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const navigate = useNavigate();
  const { student, semesters, cgpa, totalCredits, hasData } = useAcademicData();

  useEffect(() => {
    if (!student) navigate({ to: "/" });
  }, [student, navigate]);

  if (!student) return null;

  function handleDelete(num: number) {
    deleteSemester(num);
    toast.success(`Semester ${num} deleted`);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <HistoryIcon className="size-7 text-primary" />
          Academic History
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          A complete record of your saved and seeded semester data.
        </p>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center gap-4">
            <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
              <BookOpen className="size-7 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">No academic records found.</p>
              <p className="text-sm text-muted-foreground">
                Add your semester data from the Calculator tab.
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
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard label="Semesters" value={String(semesters.length)} />
            <SummaryCard label="Total Credits" value={String(totalCredits)} />
            <SummaryCard label="CGPA" value={cgpa.toFixed(2)} />
          </div>

          {semesters.map((sem) => (
            <Card key={sem.number}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>Semester {sem.number}</CardTitle>
                    <Badge
                      variant="outline"
                      className={
                        sem.source === "saved"
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {sem.source === "saved" ? "Saved" : "Seed"}
                    </Badge>
                  </div>
                  <CardDescription>
                    SGPA {sem.sgpa.toFixed(2)} · {sem.credits} credits ·{" "}
                    {sem.subjects.length} subjects
                  </CardDescription>
                </div>
                {sem.source === "saved" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(sem.number)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                )}
              </CardHeader>
              {sem.subjects.length > 0 && (
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead className="w-[100px]">Credits</TableHead>
                        <TableHead className="w-[100px]">Marks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sem.subjects.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">
                            {s.name || "—"}
                          </TableCell>
                          <TableCell>{s.credits}</TableCell>
                          <TableCell>{s.marks}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          ))}
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </div>
        <div className="text-2xl font-bold tabular-nums mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
