import { createFileRoute } from "@tanstack/react-router";
import { Lightbulb } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/suggestions")({
  component: () => (
    <PlaceholderPage
      title="Suggestions"
      description="Personalized study suggestions."
      icon={Lightbulb}
    />
  ),
});
