import { type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, type EmptyStateProps } from "@/components/empty-state";

type RouteShellProps = {
  loading?: boolean;
  empty?: boolean;
  emptyState?: EmptyStateProps;
  skeleton?: ReactNode;
  children: ReactNode;
};

/**
 * Shared loading / empty wrapper for app routes. Keeps the bootstrap
 * flash and "no data yet" state consistent across every tab.
 */
export function RouteShell({
  loading,
  empty,
  emptyState,
  skeleton,
  children,
}: RouteShellProps) {
  if (loading) return <>{skeleton ?? <DefaultRouteSkeleton />}</>;
  if (empty && emptyState)
    return (
      <Card>
        <CardContent className="py-10">
          <EmptyState {...emptyState} />
        </CardContent>
      </Card>
    );
  return <>{children}</>;
}

export function DefaultRouteSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-6 space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="py-6 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
