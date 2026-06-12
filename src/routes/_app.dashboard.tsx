import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/dashboard")({
  component: () => (
    <PlaceholderPage
      title="Dashboard"
      description="Overview of your academic performance."
      icon={LayoutDashboard}
    />
  ),
});
