import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const client = (ctx: { supabase: unknown }) => ctx.supabase as any;

export const globalSearch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ q: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data, context }) => {
    const c = client(context);
    const like = `%${data.q}%`;
    const [tasks, journal, archive] = await Promise.all([
      c.from("tasks").select("id,title,status,priority,due_date").or(`title.ilike.${like},description.ilike.${like}`).limit(8),
      c.from("journal_entries").select("id,entry_date,title,body").or(`title.ilike.${like},body.ilike.${like}`).limit(8),
      c.from("archive_items").select("id,title,item_type,description").or(`title.ilike.${like},description.ilike.${like},notes.ilike.${like}`).limit(8),
    ]);
    return {
      tasks: tasks.data ?? [],
      journal: journal.data ?? [],
      archive: archive.data ?? [],
    };
  });
