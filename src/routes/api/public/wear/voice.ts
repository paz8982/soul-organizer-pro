import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { processVoiceAudio, executeVoiceAction } from "@/lib/voice-processing.server";
import { hashToken } from "@/lib/wear-devices.functions";
import type { Database } from "@/integrations/supabase/types";


const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Wear-Token",
  "Access-Control-Max-Age": "86400",
};

const responseSchema = z.object({
  success: z.boolean(),
  action: z.string().optional(),
  transcript: z.string(),
  title: z.string().nullable().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/api/public/wear/voice")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      },

      POST: async ({ request }) => {
        try {
          const token = request.headers.get("X-Wear-Token");
          if (!token) {
            return Response.json(
              { success: false, transcript: "", error: "Missing device token" },
              { status: 401, headers: CORS_HEADERS },
            );
          }

          const supabaseUrl = process.env.SUPABASE_URL!;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
          const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const tokenHash = await hashToken(token);
          const { data: device, error: deviceError } = await supabase
            .from("wear_devices")
            .select("id, user_id, enabled")
            .eq("token_hash", tokenHash)
            .single();

          if (deviceError || !device || !device.enabled) {
            return Response.json(
              { success: false, transcript: "", error: "Invalid or revoked device token" },
              { status: 401, headers: CORS_HEADERS },
            );
          }

          const form = await request.formData();
          const audio = form.get("audio");
          const localeRaw = form.get("locale") ?? "he";
          if (!(audio instanceof Blob) || audio.size === 0) {
            return Response.json(
              { success: false, transcript: "", error: "Missing audio" },
              { status: 400, headers: CORS_HEADERS },
            );
          }

          // Convert Blob to base64
          const arrayBuffer = await audio.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          const audioBase64 = Buffer.from(bytes).toString("base64");

          const locale = localeRaw === "en" ? "en" : "he";

          const voiceResult = await processVoiceAudio({
            audioBase64,
            mimeType: audio.type || "audio/wav",
            locale,
          });

          // Update last_used_at
          await supabase.from("wear_devices").update({ last_used_at: new Date().toISOString() }).eq("id", device.id);

          if (voiceResult.action.type === "unknown") {
            return Response.json(
              {
                success: true,
                action: "unknown",
                transcript: voiceResult.transcript,
                title: null,
              },
              { status: 200, headers: CORS_HEADERS },
            );
          }

          // Execute the action as the device owner via service role.
          const result = await executeVoiceAction({
            action: voiceResult.action,
            supabase: {
              from: (table: string) => {
                const user_id = device.user_id;
                if (table === "tasks") {
                  return {
                    insert: async (values: any) => {
                      const { data: rows, error } = await supabase
                        .from("tasks")
                        .insert({ ...values, user_id })
                        .select()
                        .single();
                      if (error) throw error;
                      return { data: rows, error: null };
                    },
                  };
                }
                if (table === "journal_entries") {
                  return {
                    insert: async (values: any) => {
                      const { data: rows, error } = await supabase
                        .from("journal_entries")
                        .insert({ ...values, user_id })
                        .select()
                        .single();
                      if (error) throw error;
                      return { data: rows, error: null };
                    },
                  };
                }
                if (table === "archive_items") {
                  return {
                    insert: async (values: any) => {
                      const { data: rows, error } = await supabase
                        .from("archive_items")
                        .insert({ ...values, user_id })
                        .select()
                        .single();
                      if (error) throw error;
                      return { data: rows, error: null };
                    },
                  };
                }
                throw new Error(`Unknown table ${table}`);
              },
            } as any,
          });

          return Response.json(
            {
              success: true,
              action: result.type,
              transcript: voiceResult.transcript,
              title: result.title,
            },
            { status: 200, headers: CORS_HEADERS },
          );
        } catch (err) {
          console.error("Wear voice error:", err);
          return Response.json(
            {
              success: false,
              transcript: "",
              error: err instanceof Error ? err.message : "Unexpected error",
            },
            { status: 500, headers: CORS_HEADERS },
          );
        }
      },
    },
  },
});

export type WearVoiceResponse = z.infer<typeof responseSchema>;
