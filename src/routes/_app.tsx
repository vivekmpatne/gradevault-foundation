import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { getSession } from "@/lib/auth";
import { applyTheme, loadTheme } from "@/lib/settings-store";
import { DefaultRouteSkeleton } from "@/components/route-shell";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Auth gate: LocalStorage-backed session is client-only, so the check
    // lives here (TanStack's beforeLoad runs during SSR and can't read it).
    if (!getSession()) {
      navigate({ to: "/" });
    } else {
      applyTheme(loadTheme());
      setReady(true);
    }
  }, [navigate]);

  if (!ready) {
    return (
      <div className="min-h-screen p-4 sm:p-6">
        <DefaultRouteSkeleton />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b px-3 sm:px-4 sticky top-0 bg-background/80 backdrop-blur z-10">
            <SidebarTrigger />
            <span className="text-sm font-medium text-muted-foreground truncate">
              GradeVault
            </span>
          </header>
          <main className="flex-1 p-3 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
