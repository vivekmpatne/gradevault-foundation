import { createFileRoute } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/roadmap")({
  component: () => (
    <PlaceholderPage
      title="Roadmap"
      description="Your personalized academic roadmap."
      icon={Map}
    />
  ),
});
