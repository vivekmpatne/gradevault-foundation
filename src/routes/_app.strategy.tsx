import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Compass,
  Target,
  Lightbulb,
  ShieldAlert,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStudent } from "@/lib/student-store";
import {
  buildReport,
  useStrategyInputs,
  type CollegeTier,
  type RiskLevel,
} from "@/lib/strategy-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/strategy")({
  component: StrategyPage,
});

const PATH_TONE: Record<string, string> = {
  "on-campus": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  "off-campus": "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30",
  hybrid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
};

const RISK_TONE: Record<RiskLevel, string> = {
  low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
};

function StrategyPage() {
  const { academic, settings } = useStudent();
  const [inputs, update] = useStrategyInputs();

  // One-time prefill from live profile data if the user hasn't edited yet.
  // We only pull values that are clearly stronger than defaults.
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled) return;
    const patch: Partial<typeof inputs> = {};
    if (academic.cgpa > 0 && inputs.cgpa === 7.5) patch.cgpa = academic.cgpa;
    if (settings.leetcode > 0 && inputs.dsaRating === 1200)
      patch.dsaRating = settings.leetcode;
    if (settings.projects > 0 && inputs.projects === 1)
      patch.projects = settings.projects;
    if (Object.keys(patch).length) update(patch);
    setPrefilled(true);
  }, [academic.cgpa, settings.leetcode, settings.projects, inputs, prefilled, update]);

  const report = useMemo(() => buildReport(inputs), [inputs]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Compass className="size-7" /> Career Strategy Advisor
        </h1>
        <p className="text-muted-foreground mt-1">
          Get a tailored on-campus vs off-campus strategy for your profile.
        </p>
      </div>

      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>
            Adjust these to see the recommendation update live.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>College Tier</Label>
            <Select
              value={inputs.tier}
              onValueChange={(v) => update({ tier: v as CollegeTier })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tier1">Tier 1 — IIT / NIT / BITS</SelectItem>
                <SelectItem value="tier2">Tier 2 — Top state / private</SelectItem>
                <SelectItem value="tier3">Tier 3 — Other engineering college</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <NumField
            label="Current CGPA"
            value={inputs.cgpa}
            step={0.01}
            min={0}
            max={10}
            onChange={(v) => update({ cgpa: v })}
          />
          <NumField
            label="DSA Rating (LeetCode / equiv.)"
            value={inputs.dsaRating}
            step={50}
            min={0}
            max={4000}
            onChange={(v) => update({ dsaRating: Math.round(v) })}
          />
          <NumField
            label="Projects Count"
            value={inputs.projects}
            step={1}
            min={0}
            max={50}
            onChange={(v) => update({ projects: Math.round(v) })}
          />
          <NumField
            label="Internship Experience"
            value={inputs.internships}
            step={1}
            min={0}
            max={20}
            onChange={(v) => update({ internships: Math.round(v) })}
          />
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => toast.success("Strategy report regenerated")}
            >
              <Sparkles className="size-4" /> Regenerate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Path */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-5" /> Recommended Path
          </CardTitle>
          <CardDescription>{report.reasoning}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge
            variant="outline"
            className={cn("text-base px-3 py-1", PATH_TONE[report.path])}
          >
            {report.pathLabel}
          </Badge>
          <Badge variant="outline" className={cn("px-3 py-1", RISK_TONE[report.risk])}>
            <ShieldAlert className="size-3.5" /> {report.risk.toUpperCase()} RISK
          </Badge>
        </CardContent>
      </Card>

      {/* Strengths / Weaknesses */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" /> Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.strengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No standout strengths yet — that's what the action plan is for.
              </p>
            ) : (
              <ul className="space-y-2">
                {report.strengths.map((s, i) => (
                  <li
                    key={i}
                    className="text-sm rounded-md border p-2.5 bg-emerald-500/5 border-emerald-500/20"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5" /> Weaknesses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.weaknesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No critical gaps detected — keep the momentum.
              </p>
            ) : (
              <ul className="space-y-2">
                {report.weaknesses.map((s, i) => (
                  <li
                    key={i}
                    className="text-sm rounded-md border p-2.5 bg-amber-500/5 border-amber-500/20"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="size-5" /> Action Plan — Next 3 Months
          </CardTitle>
          <CardDescription>
            Concrete focus areas calibrated to your profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <ActionBlock title="DSA" body={report.actionPlan.dsa} />
          <ActionBlock title="Projects" body={report.actionPlan.projects} />
          <ActionBlock title="Resume" body={report.actionPlan.resume} />
          <ActionBlock title="LinkedIn" body={report.actionPlan.linkedin} />
        </CardContent>
      </Card>

      {/* Risk + Outcomes */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5" /> Risk Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge
              variant="outline"
              className={cn("text-base px-3 py-1", RISK_TONE[report.risk])}
            >
              {report.risk === "low" ? "Low Risk" : report.risk === "medium" ? "Medium Risk" : "High Risk"}
            </Badge>
            <p className="text-sm text-muted-foreground">{report.riskReason}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5" /> Expected Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.outcomes.map((o, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm rounded-md border p-2.5 bg-muted/30"
                >
                  <span className="mt-0.5 size-5 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                    {i + 1}
                  </span>
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
    </div>
  );
}

function ActionBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border p-3 bg-muted/30 space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="text-sm">{body}</div>
    </div>
  );
}
