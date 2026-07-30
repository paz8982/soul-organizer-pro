import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const client = (ctx: { supabase: unknown }) => ctx.supabase as any;

export const listGroceries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await client(context)
      .from("grocery_items")
      .select("*")
      .order("is_bought", { ascending: true })
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addGroceryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().min(1).max(200),
        quantity: z.number().int().min(1).max(999).default(1),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const c = client(context);
    const { data: last } = await c
      .from("grocery_items")
      .select("position")
      .order("position", { ascending: false })
      .limit(1);
    const nextPosition = (last?.[0]?.position ?? 0) + 1;

    const { data: row, error } = await c
      .from("grocery_items")
      .insert({
        name: data.name.trim(),
        quantity: data.quantity,
        position: nextPosition,
        user_id: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateGroceryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        patch: z
          .object({
            name: z.string().min(1).max(200).optional(),
            quantity: z.number().int().min(1).max(999).optional(),
            is_bought: z.boolean().optional(),
          })
          .refine((p) => Object.keys(p).length > 0, "empty patch"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await client(context)
      .from("grocery_items")
      .update(data.patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteGroceryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await client(context).from("grocery_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearBoughtGroceries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await client(context)
      .from("grocery_items")
      .delete()
      .eq("is_bought", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
