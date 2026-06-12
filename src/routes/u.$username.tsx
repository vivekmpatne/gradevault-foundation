import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  GraduationCap,
  Code2,
  Trophy,
  Github,
  Linkedin,
  ExternalLink,
  ArrowLeft,
  UserX,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  loadSnapshot,
  type PublicProfileSnapshot,
} from "@/lib/public-profile-store";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — GradeVault` },
      {
        name: "description",
        content: `Public Career OS profile for ${params.username} on GradeVault.`,
      },
      { property: "og:title", content: `@${params.username} on GradeVault` },
      {
        property: "og:description",
        content: "Student Career OS: academics, coding, and placements.",
      },
    ],
  }),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { username } = Route.useParams();
  const [snap, setSnap] = useState<PublicProfileSnapshot | null | undefined>(
    undefined,
  );

  useEffect(() => {
    setSnap(loadSnapshot(username));
  }, [username]);

  if (snap === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (!snap) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center space-y-4">
            <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center">
              <UserX className="size-6 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Profile not found</h1>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-mono">@{username}</span> hasn't published
                a public Career OS profile on this device.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="size-4" /> Back to GradeVault
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="size-4" /> GradeVault
          </Link>
          <Badge variant="outline" className="text-xs">
            Public profile
          </Badge>
        </div>

        {/* Identity */}
        <Card>
          <CardHeader className="flex flex-row items-start gap-4 space-y-0">
            <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <GraduationCap className="size-7" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-2xl">{snap.displayName}</CardTitle>
              <CardDescription className="font-mono text-xs mt-1">
                @{snap.username}
              </CardDescription>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground mt-2">
                {snap.branch && <span>{snap.branch}</span>}
                {snap.college && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span>{snap.college}</span>
                  </>
                )}
                <span className="hidden sm:inline">•</span>
                <span>Semester {snap.currentSemester}</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Pillars */}
        <div className="grid gap-4 sm:grid-cols-3">
          <PillarCard
            icon={GraduationCap}
            label="Academics"
            primary={snap.cgpa ? snap.cgpa.toFixed(2) : "—"}
            primaryLabel="CGPA"
            sub={`${snap.completedSemesters} sem · ${snap.totalCredits} credits`}
          />
          <PillarCard
            icon={Code2}
            label="Coding"
            primary={
              snap.coding.leetcodeSolved
                ? String(snap.coding.leetcodeSolved)
                : "—"
            }
            primaryLabel="LeetCode solved"
            sub={
              snap.coding.codeforcesRating
                ? `CF ${snap.coding.codeforcesRating}`
                : snap.coding.githubRepos
                  ? `${snap.coding.githubRepos} repos`
                  : "—"
            }
          />
          <PillarCard
            icon={Trophy}
            label="Projects"
            primary={String(snap.projects)}
            primaryLabel="Projects"
            sub={snap.goals.careerGoal ?? "Builder"}
          />
        </div>

        {/* Links */}
        {(snap.coding.githubUsername ||
          snap.coding.leetcodeUsername ||
          snap.coding.codeforcesHandle ||
          snap.links.linkedin ||
          snap.links.codolio) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profiles & Links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {snap.coding.githubUsername && (
                <LinkPill
                  icon={Github}
                  label={snap.coding.githubUsername}
                  href={`https://github.com/${snap.coding.githubUsername}`}
                />
              )}
              {snap.coding.leetcodeUsername && (
                <LinkPill
                  icon={Code2}
                  label="LeetCode"
                  href={`https://leetcode.com/${snap.coding.leetcodeUsername}`}
                />
              )}
              {snap.coding.codeforcesHandle && (
                <LinkPill
                  icon={Code2}
                  label="Codeforces"
                  href={`https://codeforces.com/profile/${snap.coding.codeforcesHandle}`}
                />
              )}
              {snap.links.linkedin && (
                <LinkPill
                  icon={Linkedin}
                  label="LinkedIn"
                  href={snap.links.linkedin}
                />
              )}
              {snap.links.codolio && (
                <LinkPill
                  icon={ExternalLink}
                  label="Codolio"
                  href={snap.links.codolio}
                />
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground pt-4">
          Updated {new Date(snap.updatedAt).toLocaleString()} · Powered by
          GradeVault
        </p>
      </div>
    </div>
  );
}

function PillarCard({
  icon: Icon,
  label,
  primary,
  primaryLabel,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary: string;
  primaryLabel: string;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Icon className="size-3.5" />
          {label}
        </div>
        <div className="text-3xl font-bold tabular-nums">{primary}</div>
        <div className="text-xs text-muted-foreground">{primaryLabel}</div>
        <div className="text-sm text-muted-foreground pt-1 border-t">
          {sub}
        </div>
      </CardContent>
    </Card>
  );
}

function LinkPill({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
    >
      <Icon className="size-3.5" />
      {label}
    </a>
  );
}
