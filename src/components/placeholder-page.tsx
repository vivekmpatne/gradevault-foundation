import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PlaceholderPage({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="size-12 rounded-xl bg-muted flex items-center justify-center mb-4">
            <Icon className="size-6 text-muted-foreground" />
          </div>
          <h2 className="font-semibold">Coming soon</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            This section is part of the upcoming GradeVault release.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
