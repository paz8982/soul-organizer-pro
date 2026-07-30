import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Supabase = SupabaseClient<Database>;

export const listWearDevices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as Supabase;
    const { data: rows, error } = await supabase
      .from("wear_devices")
      .select("id, label, token_last_four, enabled, last_used_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      id: string;
      label: string;
      token_last_four: string;
      enabled: boolean;
      last_used_at: string | null;
      created_at: string;
    }>;
  });

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export const createWearDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ label: z.string().min(1).max(100) }).parse(data))
  .handler(async ({ data, context }) => {
    const { createHash, randomBytes } = await import("crypto");
    const supabase = context.supabase as Supabase;

    // Short, human-typable pairing code. The real long token is generated on the
    // device when it exchanges this code at /api/public/wear/pair.
    const bytes = randomBytes(6);
    const code = Array.from(bytes)
      .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
      .join("");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Placeholder secret: unusable until pairing replaces it.
    const placeholder = createHash("sha256").update(randomBytes(32)).digest("hex");

    const { data: row, error } = await supabase
      .from("wear_devices")
      .insert({
        user_id: context.userId,
        label: data.label,
        token_hash: placeholder,
        token_last_four: "----",
        pairing_code: code,
        pairing_code_expires_at: expiresAt,
      })
      .select("id, label, token_last_four, enabled, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { ...(row as any), code, expiresAt };
  });


export const updateWearDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), patch: z.object({ label: z.string().min(1).max(100).optional(), enabled: z.boolean().optional() }) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as Supabase;
    const { data: row, error } = await supabase
      .from("wear_devices")
      .update(data.patch)
      .eq("id", data.id)
      .select("id, label, token_last_four, enabled, last_used_at, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row as any;
  });

export const deleteWearDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as Supabase;
    const { error } = await supabase.from("wear_devices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export async function hashToken(token: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(token).digest("hex");
}
