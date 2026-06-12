import { createFileRoute } from "@tanstack/react-router";
import {
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  Building2,
  Trophy,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStudent } from "@/lib/student-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/placement")({
  component: PlacementPage,
});

const trackLabel: Record<string, string> = {
  "on-campus": "On-Campus Placement",
  "off-campus": "Off-Campus Placement",
  "higher-studies": "Higher Studies",
};

type Tone = "good" | "warn" | "bad";

function toneClass(t: Tone) {
  if (t === "good")
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  if (t === "warn")
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
  return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
}

function progressColor(t: Tone) {
  if (t === "good") return "[&>div]:bg-emerald-500";
  if (t === "warn") return "[&>div]:bg-amber-500";
  return "[&>div]:bg-red-500";
}

type PackageRow = {
  range: string;
  minCgpa: number;
  minLeetcode: number;
  minProjects: number;
  companies: string[];
};

const PACKAGES: PackageRow[] = [
  {
    range: "5-10 LPA",
    minCgpa: 6.5,
    minLeetcode: 800,
    minProjects: 1,
    companies: ["TCS", "Infosys", "Wipro"],
  },
  {
    range: "10-15 LPA",
    minCgpa: 7.5,
    minLeetcode: 1200,
    minProjects: 2,
    companies: ["Capgemini", "Accenture", "IBM"],
  },
  {
    range: "15-20 LPA",
    minCgpa: 8.0,
    minLeetcode: 1500,
    minProjects: 3,
    companies: ["SAP", "PhonePe", "Groww"],
  },
  {
    range: "20-30 LPA",
    minCgpa: 8.5,
    minLeetcode: 1700,
    minProjects: 4,
    companies: ["Amazon", "Flipkart", "Walmart"],
  },
  {
    range: "30+ LPA",
    minCgpa: 9.0,
    minLeetcode: 2000,
    minProjects: 5,
    companies: ["Uber", "CRED", "Atlassian"],
  },
];

function PlacementPage() {
  const { academic, settings } = useStudent();

  // Readiness scoring (out of 100)
  const cgpaScore = Math.min(40, (academic.cgpa / 10) * 40);
  const lcScore = Math.min(20, (settings.leetcode / 2000) * 20);
  const cfScore = Math.min(15, (settings.codeforces / 1800) * 15);
  const projScore = Math.min(25, (settings.projects / 5) * 25);
  const readiness = Math.round(cgpaScore + lcScore + cfScore + projScore);

  const tier =
    readiness >= 80
      ? { label: "Interview Ready", tone: "good" as Tone }
      : readiness >= 60
        ? { label: "Competitive", tone: "good" as Tone }
        : readiness >= 35
          ? { label: "Developing", tone: "warn" as Tone }
          : { label: "Beginner", tone: "bad" as Tone };

  // Eligibility for each package
  const eligibility = PACKAGES.map((p) => {
    const metrics = [
      academic.cgpa / p.minCgpa,
      settings.leetcode / Math.max(1, p.minLeetcode),
      settings.projects / Math.max(1, p.minProjects),
    ];
    const ratio = metrics.reduce((a, b) => a + b, 0) / metrics.length;
    const pct = Math.min(100, Math.round(ratio * 100));
    const status: { label: string; tone: Tone; icon: typeof CheckCircle2 } =
      metrics.every((m) => m >= 1)
        ? { label: "Eligible", tone: "good", icon: CheckCircle2 }
        : metrics.every((m) => m >= 0.85)
          ? { label: "Close", tone: "warn", icon: AlertTriangle }
          : { label: "Not Ready", tone: "bad", icon: XCircle };
    return { ...p, pct, status };
  });

  // Improvement suggestions
  const suggestions: string[] = [];
  if (settings.projects < 4)
    suggestions.push(
      `Increase project count from ${settings.projects} → ${Math.max(4, settings.projects + 2)}`,
    );
  if (settings.leetcode < 1700)
    suggestions.push(
      `Reach LeetCode 1700+ (current: ${settings.leetcode || 0})`,
    );
  if (settings.codeforces < 1200)
    suggestions.push(
      `Reach Codeforces 1200+ (current: ${settings.codeforces || 0})`,
    );
  if (academic.cgpa < 8.0)
    suggestions.push(
      `Push CGPA above 8.0 (current: ${academic.cgpa.toFixed(2)})`,
    );
  if (settings.projects < 5)
    suggestions.push("Build a full-stack project to showcase end-to-end skills");
  suggestions.push("Add an internship experience for hands-on credibility");

  // Individual progress bars
  const cgpaPct = Math.min(100, (academic.cgpa / 10) * 100);
  const cgpaTone: Tone =
    academic.cgpa >= 8 ? "good" : academic.cgpa >= 7 ? "warn" : "bad";
  const lcPct = Math.min(100, (settings.leetcode / 2000) * 100);
  const lcTone: Tone =
    settings.leetcode >= 1700
      ? "good"
      : settings.leetcode >= 1200
        ? "warn"
        : "bad";
  const projPct = Math.min(100, (settings.projects / 5) * 100);
  const projTone: Tone =
    settings.projects >= 4 ? "good" : settings.projects >= 2 ? "warn" : "bad";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Briefcase className="size-7" /> Placement Advisor
        </h1>
        <p className="text-muted-foreground mt-1">
          Track: {trackLabel[settings.prepTrack]} · Goal:{" "}
          {settings.careerGoal || "—"}
        </p>
      </div>

      {/* 1. Readiness Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-5" /> Readiness Score
          </CardTitle>
          <CardDescription>
            Overall placement readiness across academics & coding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="relative flex items-center justify-center size-28 rounded-full border-4 border-muted">
              <div className="absolute text-3xl font-bold tabular-nums">
                {readiness}
              </div>
              <div className="absolute bottom-2 text-[10px] text-muted-foreground">
                /100
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Placement Tier
              </div>
              <Badge
                variant="outline"
                className={cn("text-base px-3 py-1", toneClass(tier.tone))}
              >
                {tier.label}
              </Badge>
              <div className="text-xs text-muted-foreground max-w-md">
                Beginner · Developing · Competitive · Interview Ready
              </div>
            </div>
          </div>
          <Progress value={readiness} className={progressColor(tier.tone)} />
        </CardContent>
      </Card>

      {/* 2. Eligibility Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5" /> Package Eligibility
          </CardTitle>
          <CardDescription>
            How your profile stacks up across salary bands.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package Range</TableHead>
                <TableHead className="w-[220px]">Readiness</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">
                  Example Companies
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eligibility.map((row) => {
                const Icon = row.status.icon;
                return (
                  <TableRow key={row.range}>
                    <TableCell className="font-medium">{row.range}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={row.pct}
                          className={cn("h-1.5", progressColor(row.status.tone))}
                        />
                        <span className="text-xs tabular-nums w-9 text-right">
                          {row.pct}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("gap-1", toneClass(row.status.tone))}
                      >
                        <Icon className="size-3.5" />
                        {row.status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {row.companies.join(", ")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 5. Progress Bars */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Progress</CardTitle>
          <CardDescription>
            Live progress against placement benchmarks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ProgressRow
            label="CGPA"
            value={academic.cgpa.toFixed(2)}
            target="10.00"
            pct={cgpaPct}
            tone={cgpaTone}
          />
          <ProgressRow
            label="LeetCode Rating"
            value={String(settings.leetcode || 0)}
            target="2000"
            pct={lcPct}
            tone={lcTone}
          />
          <ProgressRow
            label="Projects"
            value={String(settings.projects || 0)}
            target="5"
            pct={projPct}
            tone={projTone}
          />
        </CardContent>
      </Card>

      {/* 3. Improvement Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="size-5" /> Improvement Suggestions
          </CardTitle>
          <CardDescription>
            Focused next steps based on your current profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {suggestions.map((s, i) => (
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
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  target,
  pct,
  tone,
}: {
  label: string;
  value: string;
  target: string;
  pct: number;
  tone: Tone;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value}
          <span className="text-xs"> / {target}</span>
        </span>
      </div>
      <Progress value={pct} className={cn("h-2", progressColor(tone))} />
    </div>
  );
}
