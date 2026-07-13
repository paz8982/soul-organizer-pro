import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const client = (ctx: { supabase: unknown }) => ctx.supabase as any;

const entryInput = z.object({
  entry_date: z.string(),
  title: z.string().max(300).optional().nullable(),
  body: z.string().default(""),
  mood: z.number().int().min(1).max(5).optional().nullable(),
  tags: z.array(z.string()).default([]),
  image_urls: z.array(z.string()).default([]),
});

export const listJournalEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { search?: string; tag?: string } | undefined) => data ?? {})
  .handler(async ({ data, context }) => {
    let query = client(context)
      .from("journal_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (data.tag) query = query.contains("tags", [data.tag]);
    if (data.search)
      query = query.or(`title.ilike.%${data.search}%,body.ilike.%${data.search}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getJournalEntry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await client(context)
      .from("journal_entries")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createJournalEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entryInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await client(context)
      .from("journal_entries")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateJournalEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), patch: entryInput.partial() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await client(context)
      .from("journal_entries")
      .update(data.patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteJournalEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await client(context).from("journal_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
