import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/placement")({
  component: () => (
    <PlaceholderPage
      title="Placement"
      description="Placement readiness and opportunities."
      icon={Briefcase}
    />
  ),
});
