import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  History as HistoryIcon,
  Trash2,
  BookOpen,
  Calculator as CalculatorIcon,
  Search,
  ArrowUpDown,
  ChevronDown,
  Pencil,
  Eye,
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteSemester, useAcademicData } from "@/lib/academic-store";
import { gradePointFromMarks } from "@/lib/calculator-storage";

export const Route = createFileRoute("/_app/history")({
  component: HistoryPage,
});

const FOCUS_KEY = "gradevault_calc_focus";

function HistoryPage() {
  const navigate = useNavigate();
  const { student, semesters, cgpa, totalCredits, hasData } = useAcademicData();
  const [query, setQuery] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  useEffect(() => {
    if (!student) navigate({ to: "/" });
  }, [student, navigate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = semesters.filter((s) => {
      if (!q) return true;
      if (String(s.number).includes(q)) return true;
      if (`semester ${s.number}`.includes(q)) return true;
      return s.subjects.some((sub) => sub.name.toLowerCase().includes(q));
    });
    return [...list].sort((a, b) =>
      sortAsc ? a.number - b.number : b.number - a.number,
    );
  }, [semesters, query, sortAsc]);

  if (!student) return null;

  function toggle(num: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  }

  function expandAndView(num: number) {
    setExpanded((prev) => new Set(prev).add(num));
  }

  function handleEdit(num: number) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(FOCUS_KEY, String(num));
    }
    navigate({ to: "/calculator" });
  }

  function confirmDelete() {
    if (pendingDelete == null) return;
    const num = pendingDelete;
    deleteSemester(num);
    setPendingDelete(null);
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
          Review, edit and audit every saved semester.
        </p>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-6">
            <EmptyState
              icon={BookOpen}
              title="No academic history yet"
              description="Add your first semester from the Calculator tab and it'll show up here with full breakdowns and SGPA trends."
              action={
                <Button asChild>
                  <Link to="/calculator">
                    <CalculatorIcon className="size-4" />
                    Go to Calculator
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Search & sort */}
          <Card>
            <CardContent className="pt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search semester or subject…"
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setSortAsc((v) => !v)}
                className="sm:w-auto"
              >
                <ArrowUpDown className="size-4" />
                {sortAsc ? "Ascending" : "Descending"}
              </Button>
            </CardContent>
          </Card>

          {/* Cards */}
          <div className="space-y-3">
            {filtered.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No semesters match “{query}”.
                </CardContent>
              </Card>
            )}
            {filtered.map((sem) => {
              const isOpen = expanded.has(sem.number);
              const rows = sem.subjects.map((s) => {
                const gp = gradePointFromMarks(s.marks);
                return { ...s, gp, cp: s.credits * gp };
              });
              const totalCP = rows.reduce((a, r) => a + r.cp, 0);
              return (
                <Card key={sem.number}>
                  <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle>Semester {sem.number}</CardTitle>
                          <Badge
                            variant="outline"
                            className={
                              sem.completed
                                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                            }
                          >
                            {sem.completed ? "Completed" : "In Progress"}
                          </Badge>
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
                          {totalCP.toFixed(2)} credit points
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            expandAndView(sem.number);
                          }}
                        >
                          <Eye className="size-4" />
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(sem.number)}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPendingDelete(sem.number)}
                          disabled={sem.source !== "saved"}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-mx-3 justify-start w-fit"
                      onClick={() => toggle(sem.number)}
                    >
                      <ChevronDown
                        className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                      {isOpen ? "Hide subjects" : "Show subjects"}
                    </Button>
                  </CardHeader>
                  {isOpen && (
                    <CardContent>
                      {rows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No subjects recorded.
                        </p>
                      ) : (
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead className="w-[90px]">
                                  Credits
                                </TableHead>
                                <TableHead className="w-[90px]">
                                  Marks
                                </TableHead>
                                <TableHead className="w-[70px]">GP</TableHead>
                                <TableHead className="w-[110px] text-right">
                                  Credit Pts
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rows.map((r) => (
                                <TableRow key={r.id}>
                                  <TableCell className="font-medium">
                                    {r.name || "—"}
                                  </TableCell>
                                  <TableCell>{r.credits}</TableCell>
                                  <TableCell>{r.marks}</TableCell>
                                  <TableCell className="tabular-nums">
                                    {r.gp}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {r.cp.toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {/* CGPA Breakdown */}
          <CGPABreakdown
            semesters={semesters}
            totalCredits={totalCredits}
            cgpa={cgpa}
          />
        </>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Semester {pendingDelete}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Semester {pendingDelete}? This
              action cannot be undone and will update your CGPA and dashboard
              immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CGPABreakdown({
  semesters,
  totalCredits,
  cgpa,
}: {
  semesters: ReturnType<typeof useAcademicData>["semesters"];
  totalCredits: number;
  cgpa: number;
}) {
  const completed = semesters.filter((s) => s.completed);
  const totalCP = completed.reduce((a, s) => a + s.credits * s.sgpa, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>CGPA Breakdown</CardTitle>
        <CardDescription>
          How your cumulative grade point average is calculated.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4 text-sm font-mono">
          CGPA = Σ(Credits × SGPA) / Σ(Credits)
        </div>

        {completed.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No completed semesters yet.
          </p>
        ) : (
          <>
            <div className="space-y-1.5 text-sm">
              {completed.map((s) => (
                <div
                  key={s.number}
                  className="flex justify-between gap-3 font-mono"
                >
                  <span className="text-muted-foreground">
                    Semester {s.number}:
                  </span>
                  <span className="tabular-nums">
                    {s.credits} × {s.sgpa.toFixed(2)} ={" "}
                    {(s.credits * s.sgpa).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-1.5 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Total Credit Points
                </span>
                <span className="tabular-nums font-medium">
                  {totalCP.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Credits</span>
                <span className="tabular-nums font-medium">{totalCredits}</span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t">
                <span className="font-semibold">Final CGPA</span>
                <span className="tabular-nums font-bold text-primary">
                  {cgpa.toFixed(2)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
