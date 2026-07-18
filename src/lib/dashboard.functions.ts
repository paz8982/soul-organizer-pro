import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const client = (ctx: { supabase: unknown }) => ctx.supabase as any;

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = client(context);
    const today = new Date().toISOString().slice(0, 10);

    const [activeTasks, recentJournal, recentArchive, taskCount] = await Promise.all([
      c.from("tasks")
        .select("*")
        .eq("status", "active")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("due_time", { ascending: true, nullsFirst: false }),
      c.from("journal_entries").select("id,entry_date,title,body,mood,tags").order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(3),
      c.from("archive_items").select("id,title,item_type,url,file_path,file_mime,created_at").order("created_at", { ascending: false }).limit(6),
      c.from("tasks").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);

    return {
      today: today,
      activeTasks: activeTasks.data ?? [],
      recentJournal: recentJournal.data ?? [],
      recentArchive: recentArchive.data ?? [],
      activeTaskCount: taskCount.count ?? 0,
    };
  });
