import { createFileRoute } from "@tanstack/react-router";
import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStudent } from "@/lib/student-store";

export const Route = createFileRoute("/_app/suggestions")({
  component: SuggestionsPage,
});

function SuggestionsPage() {
  const { academic, settings } = useStudent();
  const gap = +(settings.targetCGPA - academic.cgpa).toFixed(2);

  const tips: string[] = [];
  if (academic.cgpa > 0 && gap > 0)
    tips.push(`Lift CGPA by ${gap} to reach your ${settings.targetCGPA} target.`);
  if (academic.latestSgpa && academic.latestSgpa < settings.targetCGPA)
    tips.push(`Aim for SGPA ≥ ${settings.targetCGPA} next semester to close the gap.`);
  if (settings.prepTrack !== "higher-studies" && settings.leetcode < 1500)
    tips.push("Push LeetCode rating past 1500 for placement DSA rounds.");
  if (settings.prepTrack === "higher-studies" && settings.targetGATE)
    tips.push(`Target GATE ${settings.targetGATE}: schedule a weekly mock test.`);
  if (settings.projects < 3)
    tips.push("Ship at least 3 substantial projects before applications.");
  if (tips.length === 0) tips.push("You're on track — keep the streak going.");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Lightbulb className="size-7" /> Suggestions
        </h1>
        <p className="text-muted-foreground mt-1">
          Personalized for {academic.student?.profile.name ?? "you"}.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Focus this week</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {tips.map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
