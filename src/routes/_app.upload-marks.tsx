import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  X,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  loadAllSemesters,
  saveSemester,
  type CalcSubject,
} from "@/lib/calculator-storage";
import { emitAcademicChange } from "@/lib/academic-store";
import {
  parseFile,
  toCalcSubjects,
  mergeSubjects,
  type ExtractedMarksCard,
} from "@/lib/marks-card-parser";

export const Route = createFileRoute("/_app/upload-marks")({
  component: UploadMarksPage,
});

type Stage = "upload" | "verify";

type DuplicateAction = "replace" | "merge" | "cancel";

function UploadMarksPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [extract, setExtract] = useState<ExtractedMarksCard | null>(null);

  // Editable form state
  const [studentName, setStudentName] = useState("");
  const [usn, setUsn] = useState("");
  const [semester, setSemester] = useState(1);
  const [rows, setRows] = useState<(CalcSubject & { code?: string })[]>([]);

  // Duplicate handling
  const [dupOpen, setDupOpen] = useState(false);

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setExtract(null);
    setRows([]);
    setUsn("");
    setStudentName("");
    setSemester(1);
    setStage("upload");
  }, [previewUrl]);

  const handleFile = useCallback(
    async (f: File) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setParsing(true);
      try {
        const result = await parseFile(f);
        setExtract(result);
        setStudentName(result.studentName);
        setUsn(result.usn);
        setSemester(result.semester || 1);
        setRows(
          toCalcSubjects(result.subjects).map((s, i) => ({
            ...s,
            code: result.subjects[i]?.code,
          })),
        );
        setStage("verify");
        if (result.subjects.length === 0) {
          toast.warning(
            "Nothing recognised automatically — fill the table manually.",
          );
        } else {
          toast.success(
            `Extracted ${result.subjects.length} subjects (${result.confidence}% confidence)`,
          );
        }
      } catch (e) {
        toast.error((e as Error).message || "Failed to read file");
        setFile(null);
        setPreviewUrl(null);
      } finally {
        setParsing(false);
      }
    },
    [previewUrl],
  );

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const setRow = (i: number, patch: Partial<CalcSubject & { code?: string }>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `r_${Date.now()}`,
        name: "",
        credits: 3,
        marks: 0,
        code: "",
      },
    ]);

  const removeRow = (i: number) =>
    setRows((prev) => prev.filter((_, idx) => idx !== i));

  const existingSemester = useMemo(() => {
    const all = loadAllSemesters();
    return all[semester] ?? null;
  }, [semester]);

  const validRows = useMemo(
    () => rows.filter((r) => r.name.trim().length > 0),
    [rows],
  );

  const importNow = (action: DuplicateAction) => {
    if (action === "cancel") {
      setDupOpen(false);
      return;
    }
    const cleaned: CalcSubject[] = validRows.map((r) => ({
      id: r.id,
      name: r.name.trim(),
      credits: Math.max(0, r.credits || 0),
      marks: Math.max(0, Math.min(100, r.marks || 0)),
    }));
    const subjects =
      action === "merge" && existingSemester
        ? mergeSubjects(existingSemester.subjects, cleaned)
        : cleaned;
    saveSemester({ number: semester, subjects, updatedAt: Date.now() });
    emitAcademicChange();
    toast.success(`Semester ${semester} ${action === "merge" ? "merged" : "imported"}`);
    setDupOpen(false);
    reset();
    navigate({ to: "/calculator" });
  };

  const handleImportClick = () => {
    if (validRows.length === 0) {
      toast.error("Add at least one subject before importing.");
      return;
    }
    if (existingSemester) {
      setDupOpen(true);
      return;
    }
    importNow("replace");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Upload className="size-7" /> Upload Marks Card
        </h1>
        <p className="text-muted-foreground mt-1">
          Auto-populate a semester from a VTU PDF or result screenshot.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        <StepDot active={stage === "upload"} done={stage !== "upload"} label="1. Upload" />
        <div className="h-px flex-1 bg-border" />
        <StepDot active={stage === "verify"} done={false} label="2. Verify & Import" />
      </div>

      {stage === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Choose a file</CardTitle>
            <CardDescription>
              PDF, JPG, or PNG. On mobile you can use the camera directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className={cn(
                "rounded-xl border-2 border-dashed p-8 text-center bg-muted/20 transition-colors",
                "hover:bg-muted/30 cursor-pointer",
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-10 mx-auto text-muted-foreground" />
              <div className="mt-3 font-medium">Drop your marks card here</div>
              <div className="text-xs text-muted-foreground mt-1">
                or click to browse — PDF / JPG / PNG up to 20 MB
              </div>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <FileText className="size-4 mr-1.5" /> Browse File
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                >
                  <Camera className="size-4 mr-1.5" /> Use Camera
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                hidden
                onChange={onPick}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={onPick}
              />
            </div>

            {parsing && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary animate-pulse" />
                Reading file and extracting data…
              </div>
            )}

            <Alert>
              <AlertCircle className="size-4" />
              <AlertTitle>How extraction works</AlertTitle>
              <AlertDescription className="text-xs">
                Text-based VTU PDFs extract automatically with high accuracy.
                Scanned PDFs and image uploads route to a manual fill flow today
                — the architecture is ready for OCR to slot in later.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {stage === "verify" && extract && (
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-4">
          {/* Preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Preview</CardTitle>
                <CardDescription className="truncate">
                  {file?.name}
                </CardDescription>
              </div>
              <Button size="icon" variant="ghost" onClick={reset} title="Discard">
                <X className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-muted/30 overflow-hidden aspect-[3/4] flex items-center justify-center">
                {previewUrl && file?.type.startsWith("image/") ? (
                  <img
                    src={previewUrl}
                    alt="Marks card"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : previewUrl && file?.type === "application/pdf" ? (
                  <iframe
                    src={previewUrl}
                    title="Marks card PDF"
                    className="w-full h-full"
                  />
                ) : (
                  <ImageIcon className="size-12 text-muted-foreground" />
                )}
              </div>
              <ConfidenceMeter score={extract.confidence} />
              {extract.notes.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-1">
                  {extract.notes.map((n, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span>•</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Verify form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verify & Edit</CardTitle>
              <CardDescription>
                Correct anything before importing — this becomes a Calculator semester.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="name">Student Name</Label>
                  <Input
                    id="name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="usn">USN</Label>
                  <Input
                    id="usn"
                    value={usn}
                    onChange={(e) => setUsn(e.target.value.toUpperCase())}
                    placeholder="1XX99XX999"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sem">Semester</Label>
                  <Input
                    id="sem"
                    type="number"
                    min={1}
                    max={8}
                    value={semester}
                    onChange={(e) =>
                      setSemester(
                        Math.max(
                          1,
                          Math.min(8, parseInt(e.target.value, 10) || 1),
                        ),
                      )
                    }
                  />
                </div>
              </div>

              {existingSemester && (
                <Alert>
                  <AlertCircle className="size-4" />
                  <AlertTitle>Semester {semester} already exists</AlertTitle>
                  <AlertDescription className="text-xs">
                    On import you can replace it, merge subjects, or cancel.
                  </AlertDescription>
                </Alert>
              )}

              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px]">Code</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="w-[90px]">Credits</TableHead>
                      <TableHead className="w-[90px]">Marks</TableHead>
                      <TableHead className="w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Input
                            value={r.code ?? ""}
                            onChange={(e) =>
                              setRow(i, { code: e.target.value.toUpperCase() })
                            }
                            className="h-8 text-xs font-mono"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={r.name}
                            onChange={(e) => setRow(i, { name: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={6}
                            value={r.credits}
                            onChange={(e) =>
                              setRow(i, {
                                credits: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            className="h-8 tabular-nums"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={r.marks}
                            onChange={(e) =>
                              setRow(i, {
                                marks: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            className="h-8 tabular-nums"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeRow(i)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-xs text-muted-foreground py-6"
                        >
                          No subjects yet — add one below.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={addRow}>
                  <Plus className="size-4 mr-1.5" /> Add Subject
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={reset}>
                    Discard
                  </Button>
                  <Button onClick={handleImportClick}>
                    Import To Semester {semester}
                    <ArrowRight className="size-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Duplicate dialog */}
      <Dialog open={dupOpen} onOpenChange={setDupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Semester {semester} already exists</DialogTitle>
            <DialogDescription>
              Choose how to handle the existing data — this only affects
              Semester {semester}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="rounded-md border p-3">
              <div className="font-medium">Replace Existing</div>
              <div className="text-xs text-muted-foreground">
                Overwrite all subjects in Semester {semester} with the imported list.
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="font-medium">Merge</div>
              <div className="text-xs text-muted-foreground">
                Keep existing subjects and update/insert from the new card by name.
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => importNow("cancel")}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => importNow("merge")}>
              Merge
            </Button>
            <Button onClick={() => importNow("replace")}>Replace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StepDot({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full border",
        active && "border-primary bg-primary/10 text-primary",
        done && !active && "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
        !active && !done && "text-muted-foreground",
      )}
    >
      {done ? (
        <CheckCircle2 className="size-3.5" />
      ) : (
        <span className="size-1.5 rounded-full bg-current" />
      )}
      <span className="font-medium">{label}</span>
    </div>
  );
}

function ConfidenceMeter({ score }: { score: number }) {
  const tone =
    score >= 80
      ? "emerald"
      : score >= 50
        ? "amber"
        : "rose";
  const label =
    score >= 80
      ? "High confidence"
      : score >= 50
        ? "Review recommended"
        : "Manual review required";
  const toneClass = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
  }[tone];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Extraction Confidence</span>
        <span className={cn("font-semibold tabular-nums", toneClass)}>
          {score}%
        </span>
      </div>
      <Progress value={score} />
      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
        <Badge variant="outline" className={cn("border-current text-[10px]", toneClass)}>
          {label}
        </Badge>
      </div>
    </div>
  );
}
