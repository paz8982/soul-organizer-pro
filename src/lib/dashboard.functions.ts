import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const client = (ctx: { supabase: unknown }) => ctx.supabase as any;

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = client(context);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const in7 = new Date(today.getTime() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    const [todayTasks, upcoming, overdue, recentJournal, recentArchive, taskCount] = await Promise.all([
      c.from("tasks").select("*").eq("status", "active").eq("due_date", todayStr).order("due_time", { ascending: true, nullsFirst: false }),
      c.from("tasks").select("*").eq("status", "active").gt("due_date", todayStr).lte("due_date", in7).order("due_date", { ascending: true }),
      c.from("tasks").select("*").eq("status", "active").lt("due_date", todayStr).order("due_date", { ascending: true }),
      c.from("journal_entries").select("id,entry_date,title,body,mood,tags").order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(3),
      c.from("archive_items").select("id,title,item_type,url,file_path,file_mime,created_at").order("created_at", { ascending: false }).limit(6),
      c.from("tasks").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);

    return {
      todayTasks: todayTasks.data ?? [],
      upcoming: upcoming.data ?? [],
      overdue: overdue.data ?? [],
      recentJournal: recentJournal.data ?? [],
      recentArchive: recentArchive.data ?? [],
      activeTaskCount: taskCount.count ?? 0,
    };
  });
