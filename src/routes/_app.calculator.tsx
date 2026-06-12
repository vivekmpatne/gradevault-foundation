import { createFileRoute } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/calculator")({
  component: () => (
    <PlaceholderPage
      title="Calculator"
      description="SGPA & CGPA calculator."
      icon={Calculator}
    />
  ),
});
