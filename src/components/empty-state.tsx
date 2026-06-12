import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-10 px-6 animate-fade-in",
        className,
      )}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative size-20 rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/40 grid place-items-center">
          <Icon className="size-9 text-muted-foreground/70" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mt-1.5">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
