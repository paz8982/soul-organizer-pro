import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const client = (ctx: { supabase: unknown }) => ctx.supabase as any;

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await client(context)
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { profile: data, email: (context.claims as any)?.email ?? null };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        display_name: z.string().max(120).optional(),
        avatar_url: z.string().url().optional().nullable(),
        preferences: z.record(z.string(), z.any()).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await client(context)
      .from("profiles")
      .upsert({ id: context.userId, ...data })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const exportAllData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = client(context);
    const [tasks, journal, archive, profile] = await Promise.all([
      c.from("tasks").select("*"),
      c.from("journal_entries").select("*"),
      c.from("archive_items").select("*"),
      c.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
    ]);
    return {
      exported_at: new Date().toISOString(),
      profile: profile.data,
      tasks: tasks.data ?? [],
      journal_entries: journal.data ?? [],
      archive_items: archive.data ?? [],
    };
  });
