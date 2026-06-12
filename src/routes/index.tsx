import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, LogIn, Sparkles, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  createLocalStudent,
  findStudent,
  getDemoStudent,
  getSession,
  saveSession,
  type Student,
} from "@/lib/auth";
import {
  type PrepTrack,
} from "@/lib/settings-store";
import { updateSettings } from "@/lib/student-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GradeVault — Login" },
      {
        name: "description",
        content: "Sign in to GradeVault to track your academic progress.",
      },
    ],
  }),
  component: LoginPage,
});

type Mode = "login" | "create";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");

  // Login form
  const [name, setName] = useState("");
  const [usn, setUsn] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    usn: "",
    branch: "Computer Science & Engineering",
    currentSemester: 1,
    university: "VTU",
    college: "",
    graduationYear: "",
  });

  // Onboarding
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [newStudent, setNewStudent] = useState<Student | null>(null);
  const [prepTrack, setPrepTrack] = useState<PrepTrack>("on-campus");

  useEffect(() => {
    if (getSession()) navigate({ to: "/dashboard" });
  }, [navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const student = findStudent(name, usn);
    if (!student) {
      setError("Student not found. Create an account or try Demo.");
      return;
    }
    saveSession(student);
    navigate({ to: "/dashboard" });
  };

  const handleDemo = () => {
    saveSession(getDemoStudent());
    navigate({ to: "/dashboard" });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const result = createLocalStudent({
      name: form.name,
      usn: form.usn,
      branch: form.branch,
      currentSemester: Number(form.currentSemester),
      university: form.university,
      college: form.college,
      graduationYear: form.graduationYear
        ? Number(form.graduationYear)
        : undefined,
    });
    if (!result.ok || !result.student) {
      toast.error(result.error ?? "Could not create account");
      return;
    }
    // Sign in the newly created student so settings save under their USN.
    saveSession(result.student);
    setNewStudent(result.student);
    setCreateOpen(false);
    setOnboardOpen(true);
    toast.success("Account created");
  };

  const handleFinishOnboarding = () => {
    const current = loadSettings();
    saveSettings({ ...DEFAULT_SETTINGS, ...current, prepTrack });
    setOnboardOpen(false);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="size-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg mb-4">
            <GraduationCap className="size-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">GradeVault</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your academic command center
          </p>
        </div>

        <Card className="border-border/60 shadow-xl">
          <CardHeader>
            <CardTitle>
              {mode === "login" ? "Welcome back" : "Sign in to continue"}
            </CardTitle>
            <CardDescription>
              Use your existing account, create a new student profile, or
              explore with the demo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Student Name</Label>
                <Input
                  id="name"
                  placeholder="Vivek Patne"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usn">USN</Label>
                <Input
                  id="usn"
                  placeholder="1RN24CD112"
                  value={usn}
                  onChange={(e) => setUsn(e.target.value)}
                  required
                  className="uppercase"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" size="lg">
                <LogIn className="size-4" />
                Login
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                onClick={handleDemo}
              >
                <Sparkles className="size-4" />
                Demo Account
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                size="lg"
                onClick={() => {
                  setMode("create");
                  setCreateOpen(true);
                }}
              >
                <UserPlus className="size-4" />
                Create New Student
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Try <span className="font-medium text-foreground">Demo Student / 1RN24CS001</span>
        </p>
      </div>

      {/* Create student dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create your student profile</DialogTitle>
            <DialogDescription>
              Your data lives only on this device. USN must be unique.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="c-name">Full Name *</Label>
                <Input
                  id="c-name"
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-usn">USN *</Label>
                <Input
                  id="c-usn"
                  required
                  maxLength={20}
                  className="uppercase"
                  value={form.usn}
                  onChange={(e) => setForm({ ...form, usn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-sem">Current Semester *</Label>
                <Select
                  value={String(form.currentSemester)}
                  onValueChange={(v) =>
                    setForm({ ...form, currentSemester: Number(v) })
                  }
                >
                  <SelectTrigger id="c-sem">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        Semester {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="c-branch">Branch *</Label>
                <Input
                  id="c-branch"
                  required
                  maxLength={80}
                  value={form.branch}
                  onChange={(e) =>
                    setForm({ ...form, branch: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-uni">University</Label>
                <Input
                  id="c-uni"
                  maxLength={80}
                  value={form.university}
                  onChange={(e) =>
                    setForm({ ...form, university: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-grad">Graduation Year</Label>
                <Input
                  id="c-grad"
                  type="number"
                  min={2020}
                  max={2040}
                  value={form.graduationYear}
                  onChange={(e) =>
                    setForm({ ...form, graduationYear: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="c-college">College</Label>
                <Input
                  id="c-college"
                  maxLength={120}
                  value={form.college}
                  onChange={(e) =>
                    setForm({ ...form, college: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Account</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Onboarding dialog */}
      <Dialog
        open={onboardOpen}
        onOpenChange={(o) => {
          if (!o) handleFinishOnboarding();
          setOnboardOpen(o);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Welcome{newStudent ? `, ${newStudent.profile.name.split(" ")[0]}` : ""} 👋
            </DialogTitle>
            <DialogDescription>
              What are you currently preparing for?
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={prepTrack}
            onValueChange={(v) => setPrepTrack(v as PrepTrack)}
            className="space-y-2"
          >
            {(
              [
                { v: "on-campus", l: "On-Campus Placement" },
                { v: "off-campus", l: "Off-Campus Placement" },
                { v: "higher-studies", l: "Higher Studies" },
              ] as const
            ).map((o) => (
              <label
                key={o.v}
                className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent"
              >
                <RadioGroupItem value={o.v} id={`pt-${o.v}`} />
                <span className="text-sm">{o.l}</span>
              </label>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button onClick={handleFinishOnboarding}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
