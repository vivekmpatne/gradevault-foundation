import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  Building2,
  Send,
  Code2,
  Users,
  Trophy,
  XCircle,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationStatus,
  addApplication,
  deleteApplication,
  statusBucket,
  updateApplication,
  useApplications,
} from "@/lib/placement-tracker-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/placement-tracker")({
  component: PlacementTrackerPage,
});

const STATUS_TONE: Record<ApplicationStatus, string> = {
  Wishlist: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30",
  Applied: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  "OA Scheduled": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  "OA Completed": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  "Interview Scheduled": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  "Interview Completed": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  "HR Round": "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30",
  "Offer Received": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  Rejected: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  Hold: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
};

type FormState = {
  company: string;
  role: string;
  applicationDate: string;
  link: string;
  location: string;
  notes: string;
  status: ApplicationStatus;
};

const emptyForm = (): FormState => ({
  company: "",
  role: "",
  applicationDate: new Date().toISOString().slice(0, 10),
  link: "",
  location: "",
  notes: "",
  status: "Wishlist",
});

function PlacementTrackerPage() {
  const apps = useApplications();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "board">("list");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const companies = useMemo(
    () => Array.from(new Set(apps.map((a) => a.company))).sort(),
    [apps],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (companyFilter !== "all" && a.company !== companyFilter) return false;
      if (dateFilter && a.applicationDate !== dateFilter) return false;
      if (q && !a.company.toLowerCase().includes(q) && !a.role.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [apps, search, statusFilter, companyFilter, dateFilter]);

  // Stats
  const stats = useMemo(() => {
    const buckets = {
      wishlist: 0,
      applied: 0,
      oa: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
      hold: 0,
    };
    for (const a of apps) buckets[statusBucket(a.status)]++;
    // For funnel: anything past stage counts as having reached it
    const reachedApplied =
      buckets.applied + buckets.oa + buckets.interview + buckets.offer + buckets.rejected;
    const reachedOA = buckets.oa + buckets.interview + buckets.offer;
    const reachedInterview = buckets.interview + buckets.offer;
    const reachedOffer = buckets.offer;
    return {
      total: apps.length,
      submitted: reachedApplied,
      oaStage: buckets.oa,
      interviews: buckets.interview,
      offers: buckets.offer,
      rejected: buckets.rejected,
      funnel: {
        wishlist: buckets.wishlist + reachedApplied,
        applied: reachedApplied,
        oa: reachedOA,
        interview: reachedInterview,
        offer: reachedOffer,
      },
    };
  }, [apps]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };
  const openEdit = (a: Application) => {
    setEditingId(a.id);
    setForm({
      company: a.company,
      role: a.role,
      applicationDate: a.applicationDate,
      link: a.link ?? "",
      location: a.location ?? "",
      notes: a.notes ?? "",
      status: a.status,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.company.trim() || !form.role.trim()) {
      toast.error("Company and Role are required");
      return;
    }
    const payload = {
      company: form.company.trim(),
      role: form.role.trim(),
      applicationDate: form.applicationDate || new Date().toISOString().slice(0, 10),
      link: form.link.trim() || undefined,
      location: form.location.trim() || undefined,
      notes: form.notes.trim() || undefined,
      status: form.status,
    };
    if (editingId) {
      updateApplication(editingId, payload);
      toast.success("Application updated");
    } else {
      const added = addApplication(payload);
      if (!added) {
        toast.error(
          `Duplicate: ${payload.company} • ${payload.role} on ${payload.applicationDate} already exists.`,
        );
        return;
      }
      toast.success("Application added");
    }
    setDialogOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteApplication(deleteId);
    toast.success("Application deleted");
    setDeleteId(null);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCompanyFilter("all");
    setDateFilter("");
  };

  const maxFunnel = Math.max(1, stats.funnel.wishlist);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="size-7" /> Placement Tracker
          </h1>
          <p className="text-muted-foreground mt-1">
            Track every internship and placement application in one place.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex rounded-md border p-0.5">
            <Button
              size="sm"
              variant={view === "list" ? "secondary" : "ghost"}
              onClick={() => setView("list")}
              className="h-7 gap-1.5"
            >
              <ListIcon className="size-3.5" /> List
            </Button>
            <Button
              size="sm"
              variant={view === "board" ? "secondary" : "ghost"}
              onClick={() => setView("board")}
              className="h-7 gap-1.5"
            >
              <LayoutGrid className="size-3.5" /> Board
            </Button>
          </div>
          <Button onClick={openAdd}>
            <Plus className="size-4" /> Add Application
          </Button>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total" value={stats.total} icon={Building2} tone="default" />
        <StatCard label="Submitted" value={stats.submitted} icon={Send} tone="blue" />
        <StatCard label="OA Stage" value={stats.oaStage} icon={Code2} tone="indigo" />
        <StatCard label="Interviews" value={stats.interviews} icon={Users} tone="purple" />
        <StatCard label="Offers" value={stats.offers} icon={Trophy} tone="emerald" />
        <StatCard label="Rejections" value={stats.rejected} icon={XCircle} tone="red" />
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Application Funnel</CardTitle>
          <CardDescription>
            Wishlist → Applied → OA → Interview → Offer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
            [
              { key: "wishlist", label: "Wishlist", value: stats.funnel.wishlist, color: "bg-slate-500" },
              { key: "applied", label: "Applied", value: stats.funnel.applied, color: "bg-blue-500" },
              { key: "oa", label: "OA", value: stats.funnel.oa, color: "bg-indigo-500" },
              { key: "interview", label: "Interview", value: stats.funnel.interview, color: "bg-purple-500" },
              { key: "offer", label: "Offer", value: stats.funnel.offer, color: "bg-emerald-500" },
            ] as const
          ).map((row) => {
            const pct = Math.round((row.value / maxFunnel) * 100);
            return (
              <div key={row.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{row.label}</span>
                  <span className="tabular-nums text-muted-foreground">{row.value}</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full transition-all duration-700", row.color)}
                    style={{ width: `${Math.max(pct, row.value > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Filters + Search */}
      <Card>
        <CardContent className="pt-6 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search company or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as ApplicationStatus | "all")}
            >
              <SelectTrigger className="w-full lg:w-[170px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {APPLICATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-full lg:w-[170px]">
                <SelectValue placeholder="Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All companies</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="lg:w-[170px]"
            />
            <Button variant="ghost" onClick={clearFilters} className="col-span-2 sm:col-span-3 lg:col-auto">
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List view */}
      {view === "list" && (
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            {filtered.length} of {apps.length} shown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apps.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No applications yet"
              description="Start tracking the companies you're applying to."
              action={
                <Button onClick={openAdd}>
                  <Plus className="size-4" /> Add your first application
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No applications match your filters.
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1.5">
                            {a.company}
                            {a.link && (
                              <a
                                href={a.link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                                title="Open link"
                              >
                                <ExternalLink className="size-3.5" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{a.role}</TableCell>
                        <TableCell className="tabular-nums text-sm text-muted-foreground">
                          {a.applicationDate}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(STATUS_TONE[a.status])}>
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {a.location || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(a)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteId(a.id)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {filtered.map((a) => (
                  <div key={a.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium flex items-center gap-1.5">
                          {a.company}
                          {a.link && (
                            <a
                              href={a.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground"
                            >
                              <ExternalLink className="size-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {a.role}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("shrink-0", STATUS_TONE[a.status])}>
                        {a.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{a.applicationDate}</span>
                      <span>{a.location || "—"}</span>
                    </div>
                    {a.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{a.notes}</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(a)}>
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setDeleteId(a.id)}
                      >
                        <Trash2 className="size-3.5 text-destructive" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      )}

      {/* Board (Kanban) view */}
      {view === "board" && (
        <KanbanBoard
          apps={filtered}
          draggingId={draggingId}
          setDraggingId={setDraggingId}
          onDrop={(id, status) => {
            updateApplication(id, { status });
            toast.success(`Moved to ${status}`);
          }}
          onEdit={openEdit}
          onDelete={(id) => setDeleteId(id)}
        />
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Application" : "Add Application"}</DialogTitle>
            <DialogDescription>
              Track this opportunity through every stage.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="company">Company *</Label>
                <Input
                  id="company"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Google"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="SDE Intern"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="date">Application Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.applicationDate}
                  onChange={(e) => setForm({ ...form, applicationDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as ApplicationStatus })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link">Application Link</Label>
              <Input
                id="link"
                type="url"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Bangalore / Remote"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Interview prep notes, HR feedback, recruiter contacts..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingId ? "Save Changes" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this application?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the application and its notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "default" | "blue" | "indigo" | "purple" | "emerald" | "red";
}) {
  const toneClass = {
    default: "bg-muted text-foreground",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
  }[tone];
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", toneClass)}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-xl font-bold tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

const BOARD_COLUMNS: ApplicationStatus[] = [
  "Wishlist",
  "Applied",
  "OA Scheduled",
  "Interview Scheduled",
  "Offer Received",
  "Rejected",
];

function KanbanBoard({
  apps,
  draggingId,
  setDraggingId,
  onDrop,
  onEdit,
  onDelete,
}: {
  apps: Application[];
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  onDrop: (id: string, status: ApplicationStatus) => void;
  onEdit: (a: Application) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
      <div className="flex gap-3 min-w-max sm:min-w-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {BOARD_COLUMNS.map((status) => {
          const colApps = apps.filter((a) => a.status === status);
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                if (id) onDrop(id, status);
                setDraggingId(null);
              }}
              className={cn(
                "w-72 sm:w-auto shrink-0 rounded-lg border bg-muted/30 flex flex-col",
                draggingId && "ring-1 ring-primary/20",
              )}
            >
              <div className="p-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", STATUS_TONE[status])}
                  >
                    {status}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {colApps.length}
                </span>
              </div>
              <div className="p-2 space-y-2 min-h-[120px]">
                {colApps.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Drop here
                  </p>
                )}
                {colApps.map((a) => (
                  <div
                    key={a.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", a.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDraggingId(a.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className={cn(
                      "rounded-md border bg-background p-2.5 space-y-1 cursor-grab active:cursor-grabbing transition-opacity",
                      draggingId === a.id && "opacity-40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="font-medium text-sm truncate flex-1">
                        {a.company}
                      </div>
                      {a.link && (
                        <a
                          href={a.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {a.role}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                      <span className="tabular-nums">{a.applicationDate}</span>
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => onEdit(a)}
                          className="p-1 hover:bg-muted rounded"
                          aria-label="Edit"
                        >
                          <Pencil className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(a.id)}
                          className="p-1 hover:bg-muted rounded"
                          aria-label="Delete"
                        >
                          <Trash2 className="size-3 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
