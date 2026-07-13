import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const client = (ctx: { supabase: unknown }) => ctx.supabase as any;

const taskInput = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(4000).optional().nullable(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  due_date: z.string().optional().nullable(),
  due_time: z.string().optional().nullable(),
  reminder_at: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
});

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: "active" | "completed" | "all" }) => data ?? {})
  .handler(async ({ data, context }) => {
    let query = client(context)
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (data.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => taskInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await client(context)
      .from("tasks")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), patch: taskInput.partial() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await client(context)
      .from("tasks")
      .update(data.patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["active", "completed"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch =
      data.status === "completed"
        ? { status: "completed", completed_at: new Date().toISOString() }
        : { status: "active", completed_at: null };
    const { error } = await client(context).from("tasks").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await client(context).from("tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
