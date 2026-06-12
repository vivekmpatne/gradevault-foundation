import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Settings as SettingsIcon,
  User,
  Target,
  Code2,
  Palette,
  Database,
  Download,
  Upload,
  Eraser,
  LogOut,
  Sun,
  Moon,
  Users,
  Pencil,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  clearSession,
  getCurrentStudent,
  getSession,
  isLocalStudent,
  updateLocalStudent,
} from "@/lib/auth";
import { useStudent } from "@/lib/student-store";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  loadTheme,
  saveSettings,
  setTheme as persistTheme,
  type PrepTrack,
  type StudentSettings,
  type ThemeMode,
} from "@/lib/settings-store";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

const CALC_PREFIX = "gradevault_calc_";


function SettingsPage() {
  const navigate = useNavigate();
  const student = getCurrentStudent();
  const session = getSession();
  useStudent(); // subscribe so this page re-renders when academic data updates
  const [form, setForm] = useState<StudentSettings>(DEFAULT_SETTINGS);
  const [theme, setThemeMode] = useState<ThemeMode>("light");
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const usn = student?.profile.usn;
  useEffect(() => {
    if (!usn) {
      navigate({ to: "/" });
      return;
    }
    setForm(loadSettings());
    setThemeMode(loadTheme());
  }, [usn, navigate]);

  if (!student || !session) return null;

  const isPlacement =
    form.prepTrack === "on-campus" || form.prepTrack === "off-campus";
  const isHigher = form.prepTrack === "higher-studies";

  function update<K extends keyof StudentSettings>(
    key: K,
    value: StudentSettings[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (form.targetCGPA < 0 || form.targetCGPA > 10) {
      toast.error("Target CGPA must be between 0 and 10");
      return;
    }
    saveSettings(form);
    toast.success("Settings saved");
  }

  function handleThemeChange(mode: ThemeMode) {
    setThemeMode(mode);
    persistTheme(mode);
  }

  function handleExport() {
    const data: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      usn: session!.usn,
      settings: loadSettings(),
      semesters: {},
    };
    const calcKey = `${CALC_PREFIX}${session!.usn.toUpperCase()}`;
    const raw = localStorage.getItem(calcKey);
    if (raw) {
      try {
        data.semesters = JSON.parse(raw);
      } catch {
        // ignore
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gradevault-${session!.usn}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exported");
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed.settings) {
        saveSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
        setForm({ ...DEFAULT_SETTINGS, ...parsed.settings });
      }
      if (parsed.semesters && typeof parsed.semesters === "object") {
        const calcKey = `${CALC_PREFIX}${session!.usn.toUpperCase()}`;
        localStorage.setItem(calcKey, JSON.stringify(parsed.semesters));
        window.dispatchEvent(new Event("gradevault:academic-changed"));
      }
      toast.success("Backup imported");
    } catch {
      toast.error("Invalid backup file");
    }
  }

  function handleClearDraft() {
    const calcKey = `${CALC_PREFIX}${session!.usn.toUpperCase()}`;
    localStorage.removeItem(calcKey);
    window.dispatchEvent(new Event("gradevault:academic-changed"));
    setConfirmClear(false);
    toast.success("Draft semester data cleared");
  }

  function handleLogout() {
    clearSession();
    navigate({ to: "/" });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="size-7 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your profile, goals and preferences.
        </p>
      </div>

      {/* Profile */}
      <ProfileCard />


      {/* Career Preferences */}
      <Card>
        <CardHeader>
          <SectionTitle icon={Target}>Career Preferences</SectionTitle>
          <CardDescription>Tell us what you're preparing for.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Preparing For</Label>
            <RadioGroup
              value={form.prepTrack}
              onValueChange={(v) => update("prepTrack", v as PrepTrack)}
              className="grid sm:grid-cols-3 gap-2"
            >
              {(
                [
                  { v: "on-campus", l: "On-Campus Placement" },
                  { v: "off-campus", l: "Off-Campus Placement" },
                  { v: "higher-studies", l: "Higher Studies" },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.v}
                  className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent"
                >
                  <RadioGroupItem value={opt.v} id={opt.v} />
                  <span className="text-sm">{opt.l}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="goal">Career Goal</Label>
              <Input
                id="goal"
                value={form.careerGoal}
                maxLength={120}
                onChange={(e) => update("careerGoal", e.target.value)}
                placeholder="e.g. SDE at a product company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tcgpa">Target CGPA</Label>
              <Input
                id="tcgpa"
                type="number"
                min={0}
                max={10}
                step={0.1}
                placeholder="Enter Target CGPA"
                value={form.targetCGPA || ""}
                onChange={(e) =>
                  update("targetCGPA", Number(e.target.value) || 0)
                }
              />
            </div>
            {isPlacement && (
              <div className="space-y-2">
                <Label htmlFor="tlpa">Target LPA</Label>
                <Input
                  id="tlpa"
                  type="number"
                  min={0}
                  placeholder="Enter Target LPA"
                  value={form.targetLPA || ""}
                  onChange={(e) =>
                    update("targetLPA", Number(e.target.value) || 0)
                  }
                />
              </div>
            )}
            {isHigher && (
              <div className="space-y-2">
                <Label htmlFor="tgate">Target GATE Score</Label>
                <Input
                  id="tgate"
                  type="number"
                  min={0}
                  max={1000}
                  placeholder="Enter Target GATE Score"
                  value={form.targetGATE || ""}
                  onChange={(e) =>
                    update("targetGATE", Number(e.target.value) || 0)
                  }
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Coding Profile */}
      <Card>
        <CardHeader>
          <SectionTitle icon={Code2}>Coding Profile</SectionTitle>
          <CardDescription>
            Track your competitive programming and project footprint.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <Numeric
            id="lc"
            label="LeetCode Rating"
            value={form.leetcode}
            onChange={(v) => update("leetcode", v)}
          />
          <Numeric
            id="cf"
            label="Codeforces Rating"
            value={form.codeforces}
            onChange={(v) => update("codeforces", v)}
          />
          <Numeric
            id="proj"
            label="Number of Projects"
            value={form.projects}
            onChange={(v) => update("projects", v)}
          />
          <div className="space-y-2">
            <Label htmlFor="gh">GitHub URL</Label>
            <Input
              id="gh"
              type="url"
              value={form.github}
              maxLength={255}
              onChange={(e) => update("github", e.target.value)}
              placeholder="https://github.com/username"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="li">LinkedIn URL</Label>
            <Input
              id="li"
              type="url"
              value={form.linkedin}
              maxLength={255}
              onChange={(e) => update("linkedin", e.target.value)}
              placeholder="https://linkedin.com/in/username"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Changes</Button>
      </div>

      {/* Theme */}
      <Card>
        <CardHeader>
          <SectionTitle icon={Palette}>Theme</SectionTitle>
          <CardDescription>
            Choose the interface appearance. Saved across sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            <ThemeCard
              active={theme === "light"}
              onClick={() => handleThemeChange("light")}
              icon={Sun}
              label="Light Mode"
            />
            <ThemeCard
              active={theme === "dark"}
              onClick={() => handleThemeChange("dark")}
              icon={Moon}
              label="Dark Mode"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <SectionTitle icon={Database}>Data Management</SectionTitle>
          <CardDescription>
            Export, import, or wipe your local academic data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="size-4" />
            Export All Data (JSON)
          </Button>
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            Import JSON Backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            onClick={() => setConfirmClear(true)}
          >
            <Eraser className="size-4" />
            Clear Draft Data
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              clearSession();
              navigate({ to: "/" });
            }}
          >
            <Users className="size-4" />
            Switch Account
          </Button>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="size-4" />
            Logout
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all draft semester data?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes every saved semester from your local device. Your
              profile and settings remain. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearDraft}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProfileCard() {
  const student = getCurrentStudent();
  const { academic } = useStudent();
  const editable = student ? isLocalStudent(student.profile.usn) : false;
  const [editing, setEditing] = useState(false);
  const [pf, setPf] = useState({
    name: "",
    branch: "",
    currentSemester: 1,
    college: "",
    university: "VTU",
    graduationYear: "",
  });

  const usn = student?.profile.usn;
  useEffect(() => {
    if (!student) return;
    setPf({
      name: student.profile.name,
      branch: student.profile.branch,
      currentSemester: student.profile.currentSemester || 1,
      college: student.profile.college ?? "",
      university: student.profile.university ?? "VTU",
      graduationYear: student.profile.graduationYear
        ? String(student.profile.graduationYear)
        : "",
    });
    // student object identity changes every render; key effect on usn + editing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usn, editing]);

  if (!student) return null;

  function saveProfile() {
    const res = updateLocalStudent(student!.profile.usn, {
      name: pf.name,
      branch: pf.branch,
      currentSemester: Number(pf.currentSemester),
      college: pf.college,
      university: pf.university,
      graduationYear: pf.graduationYear ? Number(pf.graduationYear) : undefined,
    });
    if (!res.ok) {
      toast.error(res.error ?? "Could not save profile");
      return;
    }
    // Keep session in sync (name may have changed).
    if (res.student) {
      localStorage.setItem(
        "gradevault_session",
        JSON.stringify({
          name: res.student.profile.name,
          usn: res.student.profile.usn,
        }),
      );
    }
    window.dispatchEvent(new Event("gradevault:academic-changed"));
    toast.success("Profile updated");
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <SectionTitle icon={User}>Profile</SectionTitle>
          <CardDescription>
            {editable
              ? "Edit your account details. USN cannot be changed."
              : "Demo accounts are read-only."}
          </CardDescription>
        </div>
        {editable && !editing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!editing ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="Student Name" value={student.profile.name} />
            <Field label="USN" value={student.profile.usn} mono />
            <Field label="Branch" value={student.profile.branch} />
            <Field
              label="University"
              value={student.profile.university ?? "VTU"}
            />
            <Field
              label="College"
              value={student.profile.college || "—"}
            />
            <Field
              label="Graduation Year"
              value={
                student.profile.graduationYear
                  ? String(student.profile.graduationYear)
                  : "—"
              }
            />
            <Field
              label="Current Semester"
              value={`Sem ${academic.currentSemester}`}
            />
          </dl>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-name">Name</Label>
              <Input
                id="p-name"
                value={pf.name}
                onChange={(e) => setPf({ ...pf, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>USN</Label>
              <Input value={student.profile.usn} disabled className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-branch">Branch</Label>
              <Input
                id="p-branch"
                value={pf.branch}
                onChange={(e) => setPf({ ...pf, branch: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-sem">Current Semester</Label>
              <Input
                id="p-sem"
                type="number"
                min={1}
                max={8}
                value={pf.currentSemester}
                onChange={(e) =>
                  setPf({ ...pf, currentSemester: Number(e.target.value) || 1 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-college">College</Label>
              <Input
                id="p-college"
                value={pf.college}
                onChange={(e) => setPf({ ...pf, college: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-grad">Graduation Year</Label>
              <Input
                id="p-grad"
                type="number"
                min={2020}
                max={2040}
                value={pf.graduationYear}
                onChange={(e) =>
                  setPf({ ...pf, graduationYear: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={saveProfile}>Save Profile</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <CardTitle className="flex items-center gap-2">
      <Icon className="size-5 text-primary" />
      {children}
    </CardTitle>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </dt>
      <dd className={`font-medium mt-1 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function Numeric({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        placeholder={`Enter ${label}`}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

function ThemeCard({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border p-4 text-left transition ${
        active
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : "hover:bg-accent"
      }`}
    >
      <div
        className={`size-10 rounded-lg flex items-center justify-center ${
          active ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">
          {active ? "Currently active" : "Tap to use"}
        </div>
      </div>
    </button>
  );
}
