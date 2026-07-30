import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const bodySchema = z.object({
  code: z.string().trim().min(6).max(6),
});

export const Route = createFileRoute("/api/public/wear/pair")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      POST: async ({ request }) => {
        try {
          const raw = await request.json().catch(() => null);
          const parsed = bodySchema.safeParse(raw);
          if (!parsed.success) {
            return Response.json(
              { success: false, error: "Invalid pairing code" },
              { status: 400, headers: CORS_HEADERS },
            );
          }
          const code = parsed.data.code.toUpperCase();

          const supabase = createClient<Database>(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } },
          );

          const { data: device, error } = await supabase
            .from("wear_devices")
            .select("id, enabled, pairing_code_expires_at")
            .eq("pairing_code", code)
            .maybeSingle();

          if (
            error ||
            !device ||
            !device.enabled ||
            !device.pairing_code_expires_at ||
            new Date(device.pairing_code_expires_at).getTime() < Date.now()
          ) {
            return Response.json(
              { success: false, error: "Invalid or expired pairing code" },
              { status: 401, headers: CORS_HEADERS },
            );
          }

          const { createHash, randomBytes } = await import("crypto");
          const token = randomBytes(32).toString("hex");
          const tokenHash = createHash("sha256").update(token).digest("hex");

          const { error: updateError } = await supabase
            .from("wear_devices")
            .update({
              token_hash: tokenHash,
              token_last_four: token.slice(-4),
              pairing_code: null,
              pairing_code_expires_at: null,
            })
            .eq("id", device.id)
            .eq("pairing_code", code);

          if (updateError) {
            return Response.json(
              { success: false, error: "Could not complete pairing" },
              { status: 500, headers: CORS_HEADERS },
            );
          }

          return Response.json({ success: true, token }, { status: 200, headers: CORS_HEADERS });
        } catch (err) {
          console.error("Wear pair error:", err);
          return Response.json(
            { success: false, error: "Unexpected error" },
            { status: 500, headers: CORS_HEADERS },
          );
        }
      },
    },
  },
});
