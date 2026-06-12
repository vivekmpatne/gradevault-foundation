import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  GraduationCap,
  LayoutDashboard,
  Calculator,
  History,
  Lightbulb,
  Briefcase,
  Map,
  Settings,
  LogOut,
  Users,
  ClipboardList,
  Gauge,
  Compass,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { clearSession, getSession } from "@/lib/auth";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Calculator", url: "/calculator", icon: Calculator },
  { title: "History", url: "/history", icon: History },
  { title: "Suggestions", url: "/suggestions", icon: Lightbulb },
  { title: "Placement", url: "/placement", icon: Briefcase },
  { title: "Placement Tracker", url: "/placement-tracker", icon: ClipboardList },
  { title: "Readiness Score", url: "/readiness", icon: Gauge },
  { title: "Strategy Advisor", url: "/strategy", icon: Compass },
  { title: "Roadmap", url: "/roadmap", icon: Map },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const student = getSession();

  const handleLogout = () => {
    clearSession();
    navigate({ to: "/" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <GraduationCap className="size-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate">GradeVault</span>
              <span className="text-xs text-muted-foreground truncate">
                {student?.name ?? "Guest"}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={handleLogout}
          className="justify-start"
          title="Switch Account"
        >
          <Users className="size-4" />
          {!collapsed && <span>Switch Account</span>}
        </Button>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={handleLogout}
          className="justify-start"
        >
          <LogOut className="size-4" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
