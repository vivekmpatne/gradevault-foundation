import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Gauge,
  GraduationCap,
  Code2,
  Hammer,
  FileText,
  Lightbulb,
  Settings as SettingsIcon,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useStudent } from "@/lib/student-store";
import {
  computeReadiness,
  recommendations,
  tierFor,
  useReadiness,
  type ProjectQuality,
  type ReadinessTier,
} from "@/lib/readiness-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/readiness")({
  component: ReadinessPage,
});

const TIER_TONE: Record<ReadinessTier, string> = {
  Beginner: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  Developing: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "Interview Ready": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  Competitive: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  "Top Candidate": "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30",
};

function ReadinessPage() {
  const { academic, settings } = useStudent();
  const [r, update] = useReadiness();

  const breakdown = useMemo(
    () =>
      computeReadiness(
        academic.cgpa,
        settings.leetcode,
        settings.codeforces,
        settings.projects,
        r,
      ),
    [academic.cgpa, settings.leetcode, settings.codeforces, settings.projects, r],
  );

  const tier = tierFor(breakdown.total);
  const recs = recommendations(
    academic.cgpa,
    settings.leetcode,
    settings.codeforces,
    settings.projects,
    breakdown,
    r,
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Gauge className="size-7" /> Placement Readiness Score
        </h1>
        <p className="text-muted-foreground mt-1">
          A realistic 100-point view of where you stand for SDE roles.
        </p>
      </div>

      {/* Overall */}
      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative size-32 rounded-full border-4 border-muted flex items-center justify-center shrink-0">
            <div className="text-center">
              <div className="text-4xl font-bold tabular-nums leading-none">
                {breakdown.total}
              </div>
              <div className="text-xs text-muted-foreground mt-1">/ 100</div>
            </div>
          </div>
          <div className="flex-1 space-y-3 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant="outline" className={cn("text-base px-3 py-1", TIER_TONE[tier])}>
                {tier}
              </Badge>
            </div>
            <Progress value={breakdown.total} className="h-2.5" />
            <div className="text-xs text-muted-foreground">
              Beginner · Developing · Interview Ready · Competitive · Top Candidate
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <div className="grid sm:grid-cols-2 gap-4">
        <BreakdownCard
          icon={GraduationCap}
          title="Academics"
          score={breakdown.academics}
          max={20}
          detail={`CGPA ${academic.cgpa.toFixed(2)}`}
        />
        <BreakdownCard
          icon={Code2}
          title="DSA"
          score={breakdown.dsa}
          max={40}
          detail={`LeetCode ${settings.leetcode || 0} · CF ${settings.codeforces || 0}`}
        />
        <BreakdownCard
          icon={Hammer}
          title="Projects"
          score={breakdown.projects}
          max={25}
          detail={`${settings.projects || 0} project${settings.projects === 1 ? "" : "s"} · ${r.projectQuality}`}
        />
        <BreakdownCard
          icon={FileText}
          title="Resume & Profile"
          score={breakdown.resume}
          max={15}
          detail={`${[r.atsResume, r.resumeReviewed, r.githubUpdated, r.linkedinUpdated].filter(Boolean).length}/4 checks complete`}
        />
      </div>

      {/* Inputs */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hammer className="size-5" /> Project Quality
            </CardTitle>
            <CardDescription>
              Self-assess the depth of your strongest projects.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Overall quality</Label>
              <Select
                value={r.projectQuality}
                onValueChange={(v) => update({ projectQuality: v as ProjectQuality })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic — tutorials, CRUD apps</SelectItem>
                  <SelectItem value="intermediate">
                    Intermediate — original idea, deployed
                  </SelectItem>
                  <SelectItem value="advanced">
                    Advanced — real users, scale, polish
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Project count ({settings.projects || 0}) is pulled from Settings.{" "}
              <Link to="/settings" className="underline">
                Update
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" /> Resume Checklist
            </CardTitle>
            <CardDescription>15 marks split across these checks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CheckRow
              label="ATS Friendly Resume"
              checked={r.atsResume}
              onChange={(v) => update({ atsResume: v })}
            />
            <CheckRow
              label="Resume Reviewed"
              checked={r.resumeReviewed}
              onChange={(v) => update({ resumeReviewed: v })}
            />
            <CheckRow
              label="GitHub Updated"
              checked={r.githubUpdated}
              onChange={(v) => update({ githubUpdated: v })}
            />
            <CheckRow
              label="LinkedIn Updated"
              checked={r.linkedinUpdated}
              onChange={(v) => update({ linkedinUpdated: v })}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="size-5" /> Recommendations
          </CardTitle>
          <CardDescription>Targeted next steps to lift your score.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {recs.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm rounded-md border p-2.5 bg-muted/30"
              >
                <span className="mt-0.5 size-5 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <Link to="/settings">
                <SettingsIcon className="size-4" /> Update CGPA / LeetCode / Projects
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BreakdownCard({
  icon: Icon,
  title,
  score,
  max,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  score: number;
  max: number;
  detail: string;
}) {
  const pct = Math.round((score / max) * 100);
  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon className="size-4" />
            </div>
            <div>
              <div className="font-medium">{title}</div>
              <div className="text-xs text-muted-foreground">{detail}</div>
            </div>
          </div>
          <div className="text-right tabular-nums">
            <div className="text-2xl font-bold leading-none">{score}</div>
            <div className="text-xs text-muted-foreground mt-0.5">/ {max}</div>
          </div>
        </div>
        <Progress value={pct} className="h-1.5" />
      </CardContent>
    </Card>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm rounded-md border p-2.5 cursor-pointer hover:bg-muted/40 transition-colors">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <span>{label}</span>
    </label>
  );
}
