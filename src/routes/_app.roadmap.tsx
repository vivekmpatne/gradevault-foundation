import { createFileRoute } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStudent } from "@/lib/student-store";

export const Route = createFileRoute("/_app/roadmap")({
  component: RoadmapPage,
});

function RoadmapPage() {
  const { academic, settings } = useStudent();
  const current = academic.currentSemester;
  const remaining = Math.max(0, 8 - academic.completedSemesters);

  const milestones: { sem: number; goal: string }[] = [];
  for (let i = current; i <= 8; i++) {
    let goal = `Target SGPA ≥ ${settings.targetCGPA.toFixed(1)}`;
    if (i === 5) goal += " · Start internship hunt";
    if (i === 6) goal += " · 2+ projects live";
    if (i === 7)
      goal +=
        settings.prepTrack === "higher-studies"
          ? ` · GATE prep (target ${settings.targetGATE})`
          : ` · Apply for placements (target ${settings.targetLPA} LPA)`;
    if (i === 8) goal += " · Final offers / admits";
    milestones.push({ sem: i, goal });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Map className="size-7" /> Roadmap
        </h1>
        <p className="text-muted-foreground mt-1">
          {remaining} semester{remaining === 1 ? "" : "s"} remaining to your goal.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            {milestones.map((m) => (
              <li key={m.sem} className="flex gap-3">
                <span className="font-semibold w-20 shrink-0">Sem {m.sem}</span>
                <span className="text-muted-foreground">{m.goal}</span>
              </li>
            ))}
            {milestones.length === 0 && (
              <li className="text-muted-foreground">All semesters completed.</li>
            )}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
