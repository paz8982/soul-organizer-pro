import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FIELDS =
  "id,title,description,notes,tags,item_type,url,file_path,file_mime,created_at,content_text,content_status";

/** Extract and store searchable content for one archive item. */
export const indexArchiveItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: row, error } = await supabase
      .from("archive_items")
      .select(FIELDS)
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const { extractArchiveContent } = await import("./archive-extract.server");
    const text = await extractArchiveContent(row, supabase);
    await supabase
      .from("archive_items")
      .update({
        content_text: text || null,
        content_indexed_at: new Date().toISOString(),
        content_status: text ? "indexed" : "empty",
      })
      .eq("id", data.id);
    return { ok: true, length: text.length };
  });

/** Natural-language search across archive items, using content extracted from links and files. */
export const smartSearchArchive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ query: z.string().min(2).max(500), locale: z.enum(["he", "en"]).default("he") })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;

    // Index a few not-yet-indexed items on demand so search stays fresh.
    const { data: pending } = await supabase
      .from("archive_items")
      .select(FIELDS)
      .eq("content_status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    if (pending?.length) {
      const { extractArchiveContent } = await import("./archive-extract.server");
      await Promise.all(
        pending.map(async (row: any) => {
          try {
            const text = await extractArchiveContent(row, supabase);
            await supabase
              .from("archive_items")
              .update({
                content_text: text || null,
                content_indexed_at: new Date().toISOString(),
                content_status: text ? "indexed" : "empty",
              })
              .eq("id", row.id);
          } catch {
            await supabase
              .from("archive_items")
              .update({ content_status: "failed", content_indexed_at: new Date().toISOString() })
              .eq("id", row.id);
          }
        }),
      );
    }

    const { data: rows, error } = await supabase
      .from("archive_items")
      .select(FIELDS)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);

    const { rankArchiveItems } = await import("./archive-search.server");
    const { matches, answer } = await rankArchiveItems(data.query, data.locale, rows ?? []);
    const byId = new Map((rows ?? []).map((r: any) => [r.id, r]));
    return {
      answer,
      results: matches
        .map((m) => ({ ...(byId.get(m.id) as any), reason: m.reason }))
        .filter(Boolean),
    };
  });
