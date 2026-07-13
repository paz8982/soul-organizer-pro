import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const client = (ctx: { supabase: unknown }) => ctx.supabase as any;

const itemInput = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(4000).optional().nullable(),
  notes: z.string().max(8000).optional().nullable(),
  tags: z.array(z.string()).default([]),
  item_type: z.enum(["file", "link", "note", "image", "pdf", "doc"]).default("note"),
  url: z.string().url().optional().nullable(),
  file_path: z.string().optional().nullable(),
  file_mime: z.string().optional().nullable(),
  file_size: z.number().int().optional().nullable(),
  source: z.string().default("manual"),
});

export const listArchive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { type?: string; search?: string; tag?: string } | undefined) => data ?? {})
  .handler(async ({ data, context }) => {
    let query = client(context)
      .from("archive_items")
      .select("*")
      .order("created_at", { ascending: false });
    if (data.type && data.type !== "all") query = query.eq("item_type", data.type);
    if (data.tag) query = query.contains("tags", [data.tag]);
    if (data.search)
      query = query.or(
        `title.ilike.%${data.search}%,description.ilike.%${data.search}%,notes.ilike.%${data.search}%`,
      );
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getArchiveItem = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await client(context)
      .from("archive_items")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createArchiveItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => itemInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await client(context)
      .from("archive_items")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateArchiveItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), patch: itemInput.partial() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await client(context)
      .from("archive_items")
      .update(data.patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteArchiveItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const item = await client(context)
      .from("archive_items")
      .select("file_path")
      .eq("id", data.id)
      .single();
    if (item.data?.file_path) {
      await client(context).storage.from("archive").remove([item.data.file_path]);
    }
    const { error } = await client(context).from("archive_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSignedFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ path: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await client(context)
      .storage.from("archive")
      .createSignedUrl(data.path, 60 * 60);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl as string };
  });
