/**
 * Server functions backing public profile snapshots.
 *
 * Snapshots are stored in `profile_snapshots` and accessed only via these
 * server functions (RLS blocks direct Data API reads). Writes require a
 * `claim_token` that lives in the original publisher's browser, so the
 * passwordless local-only auth still gives us "only the owner can update".
 *
 * `supabaseAdmin` is loaded inside each handler to keep the service-role
 * client out of the client bundle graph.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const usernameSchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9]+$/, "username must be lowercase letters and digits");

const snapshotSchema = z.object({
  version: z.literal(1),
  updatedAt: z.number(),
  username: usernameSchema,
  displayName: z.string().min(1).max(120),
  branch: z.string().max(120).optional(),
  college: z.string().max(200).optional(),
  currentSemester: z.number().int().min(1).max(8),
  cgpa: z.number().min(0).max(10),
  latestSgpa: z.number().min(0).max(10),
  totalCredits: z.number().int().min(0).max(500),
  completedSemesters: z.number().int().min(0).max(8),
  coding: z.object({
    leetcodeUsername: z.string().max(40).optional(),
    codeforcesHandle: z.string().max(40).optional(),
    githubUsername: z.string().max(40).optional(),
    leetcodeSolved: z.number().int().min(0).max(10000).optional(),
    codeforcesRating: z.number().int().min(0).max(4500).optional(),
    githubRepos: z.number().int().min(0).max(2000).optional(),
  }),
  links: z.object({
    linkedin: z.string().url().max(300).optional(),
    codolio: z.string().url().max(300).optional(),
  }),
  goals: z.object({
    careerGoal: z.string().max(200).optional(),
    targetCGPA: z.number().min(0).max(10).optional(),
  }),
  projects: z.number().int().min(0).max(500),
});

export type PublicSnapshot = z.infer<typeof snapshotSchema>;

const claimTokenSchema = z.string().min(16).max(120);

export const publishProfileSnapshot = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        snapshot: snapshotSchema,
        claimToken: claimTokenSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { snapshot, claimToken } = data;

    const { data: existing, error: selErr } = await supabaseAdmin
      .from("profile_snapshots")
      .select("claim_token")
      .eq("username", snapshot.username)
      .maybeSingle();

    if (selErr) throw new Error("Lookup failed");

    if (existing && existing.claim_token !== claimToken) {
      throw new Error(
        `@${snapshot.username} is already claimed on another device.`,
      );
    }

    const { error: upsertErr } = await supabaseAdmin
      .from("profile_snapshots")
      .upsert(
        {
          username: snapshot.username,
          claim_token: claimToken,
          data: snapshot,
        },
        { onConflict: "username" },
      );

    if (upsertErr) throw new Error("Publish failed");

    return { ok: true, username: snapshot.username, updatedAt: Date.now() };
  });

export const getPublicProfileSnapshot = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ username: usernameSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: row, error } = await supabaseAdmin
      .from("profile_snapshots")
      .select("data, updated_at")
      .eq("username", data.username)
      .maybeSingle();

    if (error) throw new Error("Lookup failed");
    if (!row) return { snapshot: null as PublicSnapshot | null, updatedAt: null as string | null };

    // Re-validate stored data so a future schema change doesn't crash the page.
    const parsed = snapshotSchema.safeParse(row.data);
    if (!parsed.success) {
      return { snapshot: null as PublicSnapshot | null, updatedAt: null as string | null };
    }
    return {
      snapshot: parsed.data,
      updatedAt: row.updated_at as string,
    };
  });

export const unpublishProfileSnapshot = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ username: usernameSchema, claimToken: claimTokenSchema })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: existing, error: selErr } = await supabaseAdmin
      .from("profile_snapshots")
      .select("claim_token")
      .eq("username", data.username)
      .maybeSingle();

    if (selErr) throw new Error("Lookup failed");
    if (!existing) return { ok: true };
    if (existing.claim_token !== data.claimToken) {
      throw new Error("Claim token mismatch — cannot unpublish.");
    }

    const { error } = await supabaseAdmin
      .from("profile_snapshots")
      .delete()
      .eq("username", data.username);
    if (error) throw new Error("Unpublish failed");
    return { ok: true };
  });
