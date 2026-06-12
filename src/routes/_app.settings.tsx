import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/settings")({
  component: () => (
    <PlaceholderPage
      title="Settings"
      description="Manage your account preferences."
      icon={Settings}
    />
  ),
});
