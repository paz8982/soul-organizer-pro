import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const client = (ctx: { supabase: unknown }) => ctx.supabase as any;

const importInput = z.object({
  items: z
    .array(
      z.object({
        url: z.string().url().max(2000),
        title: z.string().min(1).max(500),
        notes: z.string().max(4000).optional().nullable(),
        created_at: z.string().optional().nullable(),
      }),
    )
    .min(1)
    .max(500),
});

export type ImportCandidate = z.infer<typeof importInput>["items"][number];

/** Returns the URLs already stored in the user's archive (for dedupe in the preview). */
export const listArchiveUrls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await client(context)
      .from("archive_items")
      .select("url")
      .not("url", "is", null);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: { url: string }) => r.url);
  });

/** Bulk-inserts links exported from a WhatsApp chat. Skips URLs already saved. */
export const importWhatsappLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => importInput.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = client(context);

    const { data: existingRows } = await supabase
      .from("archive_items")
      .select("url")
      .not("url", "is", null);
    const existing = new Set<string>((existingRows ?? []).map((r: { url: string }) => r.url));

    const seen = new Set<string>();
    const rows = data.items
      .filter((i) => {
        if (existing.has(i.url) || seen.has(i.url)) return false;
        seen.add(i.url);
        return true;
      })
      .map((i) => {
        const ts = i.created_at ? new Date(i.created_at) : null;
        const createdAt =
          ts && !Number.isNaN(ts.getTime()) ? ts.toISOString() : new Date().toISOString();
        return {
          user_id: context.userId,
          title: i.title.slice(0, 500),
          notes: i.notes || null,
          url: i.url,
          item_type: "link" as const,
          tags: [] as string[],
          source: "whatsapp",
          created_at: createdAt,
        };
      });

    if (rows.length === 0) return { inserted: [], skipped: data.items.length };

    const { data: inserted, error } = await supabase
      .from("archive_items")
      .insert(rows)
      .select("id, url, title");
    if (error) throw new Error(error.message);

    return {
      inserted: (inserted ?? []) as { id: string; url: string; title: string }[],
      skipped: data.items.length - rows.length,
    };
  });
