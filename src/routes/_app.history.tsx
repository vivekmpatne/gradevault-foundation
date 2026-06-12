import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/history")({
  component: () => (
    <PlaceholderPage
      title="History"
      description="Your past semesters and grades."
      icon={History}
    />
  ),
});
