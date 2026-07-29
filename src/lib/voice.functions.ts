import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { processVoiceAudio } from "@/lib/voice-processing.server";

export type { VoiceResult, VoiceAction } from "@/lib/voice-processing.server";

const inputSchema = z.object({
  audioBase64: z.string().min(1),
  mimeType: z.string().min(1),
  locale: z.enum(["he", "en"]),
});

export const processVoiceCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => processVoiceAudio(data));
