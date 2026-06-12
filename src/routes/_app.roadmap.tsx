import { createFileRoute } from "@tanstack/react-router";
import {
  Map as MapIcon,
  GraduationCap,
  Code2,
  Layers,
  Briefcase,
  FileText,
  Send,
  Users,
  Trophy,
  CheckCircle2,
  Circle,
  CircleDot,
  MapPin,
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
import { useStudent } from "@/lib/student-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/roadmap")({
  component: RoadmapPage,
});

type Status = "done" | "current" | "future";

type Milestone = {
  key: string;
  title: string;
  description: string;
  icon: typeof GraduationCap;
  // Which semester this milestone is anchored to; used to derive status.
  anchorSem: number;
  // Optional override: completed if this predicate is true regardless of sem.
  completedWhen?: (ctx: {
    cgpa: number;
    projects: number;
    leetcode: number;
    codeforces: number;
  }) => boolean;
};

function statusTone(s: Status) {
  if (s === "done")
    return "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300";
  if (s === "current")
    return "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  return "border-muted bg-muted/30 text-muted-foreground";
}

function dotTone(s: Status) {
  if (s === "done") return "bg-emerald-500 text-white border-emerald-500";
  if (s === "current") return "bg-blue-500 text-white border-blue-500";
  return "bg-background text-muted-foreground border-muted";
}

function RoadmapPage() {
  const { academic, settings } = useStudent();
  const currentSem = academic.currentSemester;
  const cgpa = academic.cgpa;
  const projects = settings.projects;
  const leetcode = settings.leetcode;
  const codeforces = settings.codeforces;

  const milestones: Milestone[] = [
    {
      key: "current-sem",
      title: `Semester ${currentSem} (Current)`,
      description: `Focus on coursework — current CGPA ${cgpa.toFixed(2)}.`,
      icon: GraduationCap,
      anchorSem: currentSem,
    },
    {
      key: "mern",
      title: "MERN Stack Completion",
      description: "Master MongoDB, Express, React and Node end-to-end.",
      icon: Layers,
      anchorSem: 5,
      completedWhen: ({ projects }) => projects >= 2,
    },
    {
      key: "dsa",
      title: "DSA Progress",
      description: "Reach LeetCode 1500+ and Codeforces 1200+.",
      icon: Code2,
      anchorSem: 5,
      completedWhen: ({ leetcode, codeforces }) =>
        leetcode >= 1500 || codeforces >= 1200,
    },
    {
      key: "portfolio",
      title: "Projects Portfolio",
      description: "Ship 3+ polished projects with live demos on GitHub.",
      icon: Briefcase,
      anchorSem: 6,
      completedWhen: ({ projects }) => projects >= 3,
    },
    {
      key: "resume",
      title: "Resume Preparation",
      description: "Craft a one-page resume tailored for your target roles.",
      icon: FileText,
      anchorSem: 6,
    },
    {
      key: "applications",
      title: "Applications",
      description: "Apply to off-campus roles, referrals and hiring portals.",
      icon: Send,
      anchorSem: 7,
    },
    {
      key: "interviews",
      title: "Interviews",
      description: "Crack DSA, system design and HR rounds with mock practice.",
      icon: Users,
      anchorSem: 7,
    },
    {
      key: "offer",
      title: "Internship / Offer",
      description: `Land your target role (~${settings.targetLPA} LPA).`,
      icon: Trophy,
      anchorSem: 8,
    },
  ];

  // Determine status for each milestone.
  const withStatus = milestones.map((m, i) => {
    const ctx = { cgpa, projects, leetcode, codeforces };
    let status: Status;
    if (m.key === "current-sem") {
      status = "current";
    } else if (m.completedWhen?.(ctx)) {
      status = "done";
    } else if (m.anchorSem < currentSem) {
      status = "done";
    } else if (m.anchorSem === currentSem) {
      status = "current";
    } else {
      status = "future";
    }
    return { ...m, status, index: i };
  });

  // Ensure only first "current" stays current — subsequent same-sem items become future.
  let currentSeen = false;
  const final = withStatus.map((m) => {
    if (m.status === "current") {
      if (currentSeen) return { ...m, status: "future" as Status };
      currentSeen = true;
    }
    return m;
  });

  const doneCount = final.filter((m) => m.status === "done").length;
  const total = final.length;
  const progressPct = Math.round((doneCount / total) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <MapIcon className="size-7" /> Roadmap
        </h1>
        <p className="text-muted-foreground mt-1">
          Your path from Semester {currentSem} to your first offer.
        </p>
      </div>

      {/* Overall progress */}
      <Card>
        <CardHeader>
          <CardTitle>Journey Progress</CardTitle>
          <CardDescription>
            {doneCount} of {total} milestones complete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <div className="text-4xl font-bold tabular-nums">
              {progressPct}%
            </div>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500" /> Done
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-blue-500" /> Current
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-muted-foreground/40" />{" "}
                Future
              </span>
            </div>
          </div>
          <Progress value={progressPct} />
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute left-5 top-2 bottom-2 w-px bg-border"
          aria-hidden
        />
        <ol className="space-y-4">
          {final.map((m) => {
            const Icon = m.icon;
            const StatusIcon =
              m.status === "done"
                ? CheckCircle2
                : m.status === "current"
                  ? CircleDot
                  : Circle;
            return (
              <li key={m.key} className="relative pl-14">
                {/* Dot */}
                <div
                  className={cn(
                    "absolute left-0 top-2 size-10 rounded-full border-2 grid place-items-center shadow-sm",
                    dotTone(m.status),
                  )}
                  aria-hidden
                >
                  <Icon className="size-5" />
                </div>
                <Card
                  className={cn(
                    "border-2 transition-colors",
                    statusTone(m.status),
                  )}
                >
                  <CardContent className="py-3.5 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                            {m.title}
                          </h3>
                          {m.status === "current" && (
                            <Badge className="bg-blue-500 hover:bg-blue-500 text-white gap-1 text-[10px] px-2 py-0.5">
                              <MapPin className="size-3" />
                              YOU ARE HERE
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          {m.description}
                        </p>
                      </div>
                      <StatusIcon
                        className={cn(
                          "size-5 shrink-0 mt-0.5",
                          m.status === "done"
                            ? "text-emerald-500"
                            : m.status === "current"
                              ? "text-blue-500"
                              : "text-muted-foreground/50",
                        )}
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] capitalize",
                          m.status === "done" &&
                            "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10",
                          m.status === "current" &&
                            "border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/10",
                          m.status === "future" &&
                            "border-muted text-muted-foreground bg-muted/40",
                        )}
                      >
                        {m.status === "done"
                          ? "Completed"
                          : m.status === "current"
                            ? "In Progress"
                            : "Upcoming"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
