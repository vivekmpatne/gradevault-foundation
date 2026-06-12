import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Calculator as CalculatorIcon,
  Plus,
  Trash2,
  Save,
  Eraser,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteSemester as deleteSavedSemester,
  emitAcademicChange,
  useAcademicData,
} from "@/lib/academic-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentStudent, type Student } from "@/lib/auth";
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
import {
  gradePointFromMarks,
  loadAllSemesters,
  newSubject,
  saveSemester,
  type CalcSemester,
  type CalcSubject,
} from "@/lib/calculator-storage";

export const Route = createFileRoute("/_app/calculator")({
  component: CalculatorPage,
});

const NEW_SEM = "new";

function CalculatorPage() {
  const navigate = useNavigate();
  const academic = useAcademicData();
  const [student, setStudent] = useState<Student | null>(null);
  const [saved, setSaved] = useState<Record<number, CalcSemester>>({});
  const [selected, setSelected] = useState<string>("1");
  const [subjects, setSubjects] = useState<CalcSubject[]>([newSubject()]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const s = getCurrentStudent();
    if (!s) {
      navigate({ to: "/" });
      return;
    }
    setStudent(s);
    const all = loadAllSemesters();
    setSaved(all);
    // Honor an Edit hand-off from History; otherwise use the derived current sem.
    let initial = String(academic.currentSemester || 1);
    if (typeof window !== "undefined") {
      const focus = sessionStorage.getItem("gradevault_calc_focus");
      if (focus) {
        initial = focus;
        sessionStorage.removeItem("gradevault_calc_focus");
      }
    }
    setSelected(initial);
    loadInto(initial, all, s);
  }, [navigate]);

  function loadInto(
    sel: string,
    all: Record<number, CalcSemester>,
    s: Student,
  ) {
    if (sel === NEW_SEM) {
      setSubjects([newSubject()]);
      return;
    }
    const num = Number(sel);
    const stored = all[num];
    if (stored) {
      setSubjects(stored.subjects.length ? stored.subjects : [newSubject()]);
      return;
    }
    // fallback: seed from bundled semester data if available
    const bundled = s.semesters.find((x) => x.number === num);
    if (bundled) {
      setSubjects(
        bundled.subjects.map((sub) => ({
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `s_${Math.random().toString(36).slice(2)}`,
          name: sub.name,
          credits: sub.credits,
          marks: gradeToApproxMarks(sub.grade),
        })),
      );
    } else {
      setSubjects([newSubject()]);
    }
  }

  function handleSelect(val: string) {
    setSelected(val);
    if (student) loadInto(val, saved, student);
  }

  function updateSubject(id: string, patch: Partial<CalcSubject>) {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  }

  function addRow() {
    setSubjects((prev) => [...prev, newSubject()]);
  }

  function removeRow(id: string) {
    setSubjects((prev) =>
      prev.length === 1 ? prev : prev.filter((s) => s.id !== id),
    );
  }

  const rows = useMemo(
    () =>
      subjects.map((s) => {
        const gp = gradePointFromMarks(s.marks);
        const cp = s.credits * gp;
        return { ...s, gp, cp };
      }),
    [subjects],
  );

  const totalCredits = rows.reduce((a, r) => a + (r.credits || 0), 0);
  const totalCP = rows.reduce((a, r) => a + r.cp, 0);
  const sgpa = totalCredits > 0 ? totalCP / totalCredits : 0;
  const sgpaRounded = Number(sgpa.toFixed(2));

  const status = statusFor(sgpa);

  const validation = subjects
    .map((s, i) => {
      if (s.credits < 1 || s.credits > 4)
        return `Row ${i + 1}: credits must be 1–4`;
      if (s.marks < 0 || s.marks > 100)
        return `Row ${i + 1}: marks must be 0–100`;
      return null;
    })
    .filter(Boolean) as string[];

  function handleSave() {
    if (validation.length) {
      toast.error(validation[0]);
      return;
    }
    if (selected === NEW_SEM) {
      const next = nextAvailableSemester(saved);
      const sem: CalcSemester = {
        number: next,
        subjects,
        updatedAt: Date.now(),
      };
      saveSemester(sem);
      const all = { ...saved, [next]: sem };
      setSaved(all);
      setSelected(String(next));
      emitAcademicChange();
      toast.success(`Saved as Semester ${next}`);
      return;
    }
    const num = Number(selected);
    const sem: CalcSemester = { number: num, subjects, updatedAt: Date.now() };
    saveSemester(sem);
    setSaved({ ...saved, [num]: sem });
    emitAcademicChange();
    toast.success(`Semester ${num} saved`);
  }

  function handleDelete() {
    if (selected === NEW_SEM) return;
    const num = Number(selected);
    if (!saved[num]) {
      toast("Nothing saved to delete");
      return;
    }
    deleteSavedSemester(num);
    const next = { ...saved };
    delete next[num];
    setSaved(next);
    setSubjects([newSubject()]);
    toast.success(`Semester ${num} deleted`);
  }

  function handleClear() {
    setSubjects([newSubject()]);
    toast("Draft cleared");
  }

  if (!student) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <CalculatorIcon className="size-7 text-primary" />
          SGPA Calculator
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Add subjects, enter marks, and your SGPA updates in real time.
        </p>
      </div>

      {/* Semester selector + summary */}
      <Card>
        <CardHeader>
          <CardTitle>Semester</CardTitle>
          <CardDescription>
            Pick an existing semester to edit, or create a new one.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[260px_1fr] md:items-end">
          <div className="space-y-2">
            <Label>Select semester</Label>
            <Select value={selected} onValueChange={handleSelect}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    Semester {n}
                    {saved[n] ? " • saved" : ""}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_SEM}>＋ Create new semester</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <SummaryStat label="Total Credits" value={String(totalCredits)} />
            <SummaryStat label="Credit Points" value={totalCP.toFixed(2)} />
            <SummaryStat
              label="SGPA"
              value={sgpaRounded.toFixed(2)}
              accent
              badge={
                <Badge variant="outline" className={status.cls}>
                  {status.label}
                </Badge>
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Subjects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Subjects</CardTitle>
            <CardDescription>
              Credits 1–4 · Marks 0–100. Grade point auto-calculates.
            </CardDescription>
          </div>
          <Button onClick={addRow} size="sm">
            <Plus className="size-4" />
            Add Subject
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Subject</TableHead>
                  <TableHead className="w-[110px]">Credits</TableHead>
                  <TableHead className="w-[110px]">Marks</TableHead>
                  <TableHead className="w-[100px]">GP</TableHead>
                  <TableHead className="w-[120px]">Credit Points</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Input
                        value={r.name}
                        onChange={(e) =>
                          updateSubject(r.id, { name: e.target.value })
                        }
                        placeholder="e.g. Data Structures"
                        maxLength={80}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        max={4}
                        placeholder="Credits"
                        value={r.credits || ""}
                        onChange={(e) =>
                          updateSubject(r.id, {
                            credits: clampInt(e.target.value, 0, 4),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Enter Marks"
                        value={r.marks || ""}
                        onChange={(e) =>
                          updateSubject(r.id, {
                            marks: clampInt(e.target.value, 0, 100),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {r.gp}
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {r.cp.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(r.id)}
                        disabled={subjects.length === 1}
                        aria-label="Remove subject"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {rows.map((r, i) => (
              <div
                key={r.id}
                className="rounded-lg border p-3 space-y-3 bg-card"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Subject {i + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(r.id)}
                    disabled={subjects.length === 1}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={r.name}
                    onChange={(e) =>
                      updateSubject(r.id, { name: e.target.value })
                    }
                    placeholder="Subject name"
                    maxLength={80}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Credits</Label>
                    <Input
                      type="number"
                      min={1}
                      max={4}
                      placeholder="Credits"
                      value={r.credits || ""}
                      onChange={(e) =>
                        updateSubject(r.id, {
                          credits: clampInt(e.target.value, 0, 4),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Marks</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Enter Marks"
                      value={r.marks || ""}
                      onChange={(e) =>
                        updateSubject(r.id, {
                          marks: clampInt(e.target.value, 0, 100),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm pt-1">
                  <div>
                    <div className="text-xs text-muted-foreground">GP</div>
                    <div className="font-medium tabular-nums">{r.gp}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Credit Points
                    </div>
                    <div className="font-medium tabular-nums">
                      {r.cp.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {validation.length > 0 && (
            <ul className="text-sm text-destructive list-disc pl-5">
              {validation.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2 justify-end pt-2 border-t">
            {selected !== NEW_SEM && saved[Number(selected)] && (
              <Button variant="ghost" onClick={handleDelete}>
                <Trash2 className="size-4" />
                Delete Semester
              </Button>
            )}
            <Button variant="outline" onClick={handleClear}>
              <Eraser className="size-4" />
              Clear Draft
            </Button>
            <Button onClick={handleSave} disabled={validation.length > 0}>
              <Save className="size-4" />
              Save Semester
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  accent,
  badge,
}: {
  label: string;
  value: string;
  accent?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        accent ? "bg-primary/5 border-primary/30" : "bg-muted/30"
      }`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center justify-between mt-1 gap-2">
        <div className="text-xl font-bold tabular-nums">{value}</div>
        {badge}
      </div>
    </div>
  );
}

function clampInt(v: string, min: number, max: number): number {
  const n = Math.floor(Number(v));
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function nextAvailableSemester(saved: Record<number, CalcSemester>): number {
  for (let n = 1; n <= 8; n++) {
    if (!saved[n]) return n;
  }
  return 8;
}

function statusFor(sgpa: number): { label: string; cls: string } {
  if (sgpa >= 9)
    return {
      label: "Excellent",
      cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    };
  if (sgpa >= 8)
    return {
      label: "Good",
      cls: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    };
  if (sgpa >= 7)
    return {
      label: "Fair",
      cls: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    };
  return {
    label: "Needs Improvement",
    cls: "bg-destructive/15 text-destructive border-destructive/30",
  };
}

function gradeToApproxMarks(grade: string): number {
  const g = grade.trim().toUpperCase();
  switch (g) {
    case "O":
    case "S":
    case "A+":
      return 95;
    case "A":
      return 85;
    case "B+":
    case "B":
      return 75;
    case "C+":
    case "C":
      return 65;
    case "D":
      return 55;
    case "E":
      return 45;
    default:
      return 0;
  }
}
