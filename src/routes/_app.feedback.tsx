import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  MessageSquare,
  Send,
  Search,
  Star,
  Bug,
  Lightbulb,
  Download,
  Trash2,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { getSession } from "@/lib/auth";
import {
  FEEDBACK_CATEGORIES,
  addFeedback,
  deleteFeedback,
  useFeedback,
  type FeedbackCategory,
  type FeedbackEntry,
} from "@/lib/feedback-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/feedback")({
  component: FeedbackPage,
});

const CATEGORY_TONE: Record<FeedbackCategory, string> = {
  "Bug Report": "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  "Feature Request":
    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  "UI/UX Feedback":
    "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  "General Feedback":
    "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
};

function FeedbackPage() {
  const all = useFeedback();
  const session = getSession();
  const currentUsn = session?.usn ?? "";

  const [devMode, setDevMode] = useState(false);

  const [category, setCategory] = useState<FeedbackCategory>("General Feedback");
  const [rating, setRating] = useState(8);
  const [comment, setComment] = useState("");

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<FeedbackCategory | "all">("all");
  const [sort, setSort] = useState<"newest" | "rating-desc" | "rating-asc">(
    "newest",
  );

  // Visible list — in dev mode everyone, otherwise just the current user's
  const visible = useMemo(
    () => (devMode ? all : all.filter((f) => f.authorUsn === currentUsn)),
    [all, devMode, currentUsn],
  );

  // Stats are based on the ENTIRE collection (the question asks for app-wide
  // counts/averages), independent of dev mode.
  const stats = useMemo(() => {
    const total = all.length;
    const avg = total ? all.reduce((s, f) => s + f.rating, 0) / total : 0;
    const bugs = all.filter((f) => f.category === "Bug Report").length;
    const feats = all.filter((f) => f.category === "Feature Request").length;
    return { total, avg, bugs, feats };
  }, [all]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = visible.filter((f) => {
      if (filterCat !== "all" && f.category !== filterCat) return false;
      if (q && !f.comment.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === "rating-desc") list = [...list].sort((a, b) => b.rating - a.rating);
    else if (sort === "rating-asc") list = [...list].sort((a, b) => a.rating - b.rating);
    else list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [visible, filterCat, search, sort]);

  const handleSubmit = () => {
    if (!comment.trim()) {
      toast.error("Please add a comment");
      return;
    }
    addFeedback({ category, rating, comment });
    toast.success("Thanks for the feedback!");
    setComment("");
    setRating(8);
    setCategory("General Feedback");
  };

  const handleExport = () => {
    const payload = devMode ? all : visible;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gradevault-feedback-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Feedback exported");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="size-7" /> Feedback Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Help us make GradeVault better — report bugs, request features, or
            just share a thought.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Shield className="size-4 text-muted-foreground" />
            <span>Developer Mode</span>
            <Switch checked={devMode} onCheckedChange={setDevMode} />
          </label>
        </div>
      </div>

      {/* Dashboard cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Feedback" value={String(stats.total)} icon={MessageSquare} />
        <StatCard
          label="Average Rating"
          value={stats.total ? `${stats.avg.toFixed(1)} / 10` : "—"}
          icon={Star}
        />
        <StatCard label="Bug Reports" value={String(stats.bugs)} icon={Bug} />
        <StatCard
          label="Feature Requests"
          value={String(stats.feats)}
          icon={Lightbulb}
        />
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Submit Feedback</CardTitle>
          <CardDescription>
            Posting as {session?.name ?? "Guest"} ({session?.usn ?? "—"}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as FeedbackCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rating: {rating} / 10</Label>
              <Slider
                value={[rating]}
                onValueChange={(v) => setRating(v[0] ?? rating)}
                min={1}
                max={10}
                step={1}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSubmit}>
              <Send className="size-4" /> Submit Feedback
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters + list */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>{devMode ? "All Feedback" : "Your Feedback"}</CardTitle>
            <CardDescription>
              {filtered.length} of {visible.length} shown
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-4" /> Export JSON
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={filterCat}
              onValueChange={(v) => setFilterCat(v as FeedbackCategory | "all")}
            >
              <SelectTrigger className="lg:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {FEEDBACK_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <SelectTrigger className="lg:w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="rating-desc">Rating: high → low</SelectItem>
                <SelectItem value="rating-asc">Rating: low → high</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={devMode ? "No feedback yet" : "You haven't submitted feedback yet"}
              description="Use the form above to send your first piece of feedback."
            />
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No feedback matches your filters.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {filtered.map((f) => (
                <FeedbackCard
                  key={f.id}
                  entry={f}
                  showAuthor={devMode}
                  onDelete={
                    f.authorUsn === currentUsn || devMode
                      ? () => {
                          deleteFeedback(f.id);
                          toast.success("Feedback deleted");
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
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

function FeedbackCard({
  entry,
  showAuthor,
  onDelete,
}: {
  entry: FeedbackEntry;
  showAuthor: boolean;
  onDelete?: () => void;
}) {
  const date = new Date(entry.createdAt).toLocaleDateString();
  return (
    <div className="rounded-lg border p-3 space-y-2 bg-card">
      <div className="flex items-start justify-between gap-2">
        <Badge variant="outline" className={cn(CATEGORY_TONE[entry.category])}>
          {entry.category}
        </Badge>
        <div className="flex items-center gap-1 text-sm font-medium tabular-nums">
          <Star className="size-3.5 text-amber-500 fill-amber-500" />
          {entry.rating}/10
        </div>
      </div>
      <p className="text-sm whitespace-pre-wrap break-words">{entry.comment}</p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {showAuthor ? `${entry.authorName} · ${entry.authorUsn}` : "You"} · {date}
        </span>
        {onDelete && (
          <button
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive transition-colors"
            title="Delete"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
