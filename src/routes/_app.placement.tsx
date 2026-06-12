import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStudent } from "@/lib/student-store";

export const Route = createFileRoute("/_app/placement")({
  component: PlacementPage,
});

const trackLabel: Record<string, string> = {
  "on-campus": "On-Campus Placement",
  "off-campus": "Off-Campus Placement",
  "higher-studies": "Higher Studies",
};

function PlacementPage() {
  const { academic, settings } = useStudent();
  const ready =
    academic.cgpa >= 7 && settings.projects >= 2 && settings.leetcode >= 1200;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Briefcase className="size-7" /> Placement
        </h1>
        <p className="text-muted-foreground mt-1">
          Track: {trackLabel[settings.prepTrack]} · Goal:{" "}
          {settings.careerGoal || "—"}
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Stat label="Current CGPA" value={academic.cgpa.toFixed(2)} />
        <Stat label="Target CGPA" value={settings.targetCGPA.toFixed(2)} />
        <Stat label="Target LPA" value={`${settings.targetLPA} LPA`} />
        <Stat label="LeetCode" value={String(settings.leetcode)} />
        <Stat label="Codeforces" value={String(settings.codeforces)} />
        <Stat label="Projects" value={String(settings.projects)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Readiness</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {ready
            ? "You meet baseline placement criteria. Start applying."
            : "Improve CGPA ≥ 7, projects ≥ 2, and LeetCode ≥ 1200 to be placement-ready."}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
