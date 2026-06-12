import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Share2,
  Copy,
  ExternalLink,
  Globe,
  EyeOff,
  RefreshCw,
  Loader2,
} from "lucide-react";
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
import { useStudent } from "@/lib/student-store";
import {
  buildSnapshot,
  clearClaimToken,
  getOrCreateClaimToken,
  shareUrl,
  usernameFromUsn,
} from "@/lib/public-profile-store";
import {
  getPublicProfileSnapshot,
  publishProfileSnapshot,
  unpublishProfileSnapshot,
} from "@/lib/public-profile.functions";

export const Route = createFileRoute("/_app/profile-share")({
  component: ProfileSharePage,
});

function ProfileSharePage() {
  const { academic, settings, profileCompletion } = useStudent();
  const [published, setPublished] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState<"publish" | "unpublish" | null>(null);
  const [checking, setChecking] = useState(true);

  const username = academic.student
    ? usernameFromUsn(academic.student.profile.usn)
    : "";

  const url = username ? shareUrl(username) : "";

  useEffect(() => {
    if (!username) {
      setChecking(false);
      return;
    }
    setChecking(true);
    getPublicProfileSnapshot({ data: { username } })
      .then((res) => {
        setPublished(!!res.snapshot);
        setUpdatedAt(res.updatedAt);
      })
      .catch(() => {
        setPublished(false);
        setUpdatedAt(null);
      })
      .finally(() => setChecking(false));
  }, [username]);

  if (!academic.student) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-muted-foreground">Sign in to manage your profile.</p>
      </div>
    );
  }

  const handlePublish = async () => {
    const snapshot = buildSnapshot(academic, settings);
    if (!snapshot) {
      toast.error("Could not build profile snapshot");
      return;
    }
    const claimToken = getOrCreateClaimToken(snapshot.username);
    setBusy("publish");
    try {
      const res = await publishProfileSnapshot({
        data: { snapshot, claimToken },
      });
      setPublished(true);
      setUpdatedAt(new Date(res.updatedAt).toISOString());
      toast.success(published ? "Profile refreshed" : "Profile published");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Publish failed. Try again.",
      );
    } finally {
      setBusy(null);
    }
  };

  const handleUnpublish = async () => {
    if (!username) return;
    const claimToken = getOrCreateClaimToken(username);
    setBusy("unpublish");
    try {
      await unpublishProfileSnapshot({
        data: { username, claimToken },
      });
      clearClaimToken(username);
      setPublished(false);
      setUpdatedAt(null);
      toast.success("Profile unpublished");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unpublish failed. Try again.",
      );
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Share2 className="size-6" /> Public Profile
        </h1>
        <p className="text-muted-foreground mt-1">
          Publish a read-only Career OS card at a shareable URL — viewable from
          any device.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                {checking ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />{" "}
                    Checking…
                  </>
                ) : published ? (
                  <>
                    <Globe className="size-4 text-emerald-600" /> Live
                  </>
                ) : (
                  <>
                    <EyeOff className="size-4 text-muted-foreground" /> Not
                    published
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {published && updatedAt
                  ? `Last updated ${new Date(updatedAt).toLocaleString()}`
                  : "Publish to generate a shareable link."}
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              @{username}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={url} readOnly className="font-mono text-xs" />
            <Button variant="outline" onClick={handleCopy} disabled={!published}>
              <Copy className="size-4" />
            </Button>
            <Button variant="outline" asChild disabled={!published}>
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePublish} disabled={busy !== null}>
              {busy === "publish" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {published ? "Refresh snapshot" : "Publish profile"}
            </Button>
            {published && (
              <Button
                variant="outline"
                onClick={handleUnpublish}
                disabled={busy !== null}
              >
                {busy === "unpublish" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <EyeOff className="size-4" />
                )}
                Unpublish
              </Button>
            )}
          </div>

          {profileCompletion.total < 80 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              Your profile is {profileCompletion.total}% complete. Fill out
              more sections in{" "}
              <Link to="/settings" className="underline font-medium">
                Settings
              </Link>{" "}
              for a stronger share card.
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Snapshot includes: name, branch, college, semester, CGPA, coding
            stats, project count, and any public links you've added. Updates
            and unpublishing are protected by a private claim token stored in
            this browser only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
