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
  MessageSquare,
  Code2,
  Upload,
  UserCircle,
  Share2,
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

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Academics",
    items: [
      { title: "Calculator", url: "/calculator", icon: Calculator },
      { title: "Upload Marks", url: "/upload-marks", icon: Upload },
      { title: "History", url: "/history", icon: History },
      { title: "Suggestions", url: "/suggestions", icon: Lightbulb },
    ],
  },
  {
    label: "Growth",
    items: [
      { title: "Coding Hub", url: "/coding-hub", icon: Code2 },
      { title: "Readiness", url: "/readiness", icon: Gauge },
      { title: "Strategy", url: "/strategy", icon: Compass },
      { title: "Roadmap", url: "/roadmap", icon: Map },
    ],
  },
  {
    label: "Placements",
    items: [
      { title: "Placement", url: "/placement", icon: Briefcase },
      { title: "Tracker", url: "/placement-tracker", icon: ClipboardList },
    ],
  },
  {
    label: "Profile",
    items: [
      { title: "Public Profile", url: "/profile-share", icon: Share2 },
      { title: "Feedback", url: "/feedback", icon: MessageSquare },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];

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
                Student Career OS
              </span>
            </div>
          )}
        </div>
        {!collapsed && student && (
          <div className="px-2 pb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <UserCircle className="size-3.5 shrink-0" />
            <span className="truncate">{student.name}</span>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                    >
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
        ))}
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
