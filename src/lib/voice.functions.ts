import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

const inputSchema = z.object({
  audioBase64: z.string().min(1),
  mimeType: z.string().min(1),
  locale: z.enum(["he", "en"]),
});

function extForMime(mime: string): string {
  const m = mime.toLowerCase().split(";")[0];
  if (m.includes("webm")) return "webm";
  if (m.includes("mp4") || m.includes("m4a")) return "mp4";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("wav")) return "wav";
  if (m.includes("ogg")) return "ogg";
  return "webm";
}

function base64ToUint8(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const actionSchema = z.object({
  transcript: z.string(),
  action: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("task"),
      title: z.string(),
      priority: z.enum(["high", "medium", "low"]).default("medium"),
      due_date: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
    }),
    z.object({
      type: z.literal("journal"),
      title: z.string().nullable().optional(),
      body: z.string(),
    }),
    z.object({
      type: z.literal("search_archive"),
      query: z.string(),
    }),
    z.object({
      type: z.literal("unknown"),
      reason: z.string().optional(),
    }),
  ]),
});

export type VoiceResult = z.infer<typeof actionSchema>;

export const processVoiceCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<VoiceResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    // 1) Transcribe
    const bytes = base64ToUint8(data.audioBase64);
    const ext = extForMime(data.mimeType);
    const blob = new Blob([bytes], { type: data.mimeType });
    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", blob, `recording.${ext}`);
    if (data.locale === "he") form.append("language", "he");
    else form.append("language", "en");

    const sttRes = await fetch(`${GATEWAY}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!sttRes.ok) {
      const errText = await sttRes.text().catch(() => "");
      throw new Error(`Transcription failed [${sttRes.status}]: ${errText}`);
    }
    const sttJson = (await sttRes.json()) as { text?: string };
    const transcript = (sttJson.text ?? "").trim();
    if (!transcript) {
      return { transcript: "", action: { type: "unknown", reason: "empty" } };
    }

    // 2) Interpret
    const today = new Date().toISOString().slice(0, 10);
    const sys =
      data.locale === "he"
        ? `אתה עוזר שממיר בקשה קולית קצרה של המשתמש לפעולה מובנית באפליקציית "המוח השני".
בחר את סוג הפעולה מתוך: task (משימה חדשה), journal (רשומת יומן), search_archive (חיפוש בארכיון), unknown.
- task: חלץ כותרת קצרה, עדיפות (high/medium/low) אם ניתן להסיק, ותאריך יעד ב-YYYY-MM-DD אם המשתמש ציין (היום הוא ${today}).
- journal: העתק את מה שהמשתמש רוצה לכתוב ל-body. כותרת קצרה אם ברור.
- search_archive: חלץ את מונח החיפוש בלבד.
- unknown: אם לא ברור מה הבקשה.
ענה JSON בלבד לפי הסכימה.`
        : `You convert a short user voice request into a structured action for the "Second Brain" app.
Pick action type from: task (new task), journal (journal entry), search_archive (archive search), unknown.
- task: extract a short title, priority (high/medium/low) if inferrable, and due_date YYYY-MM-DD if the user mentioned one (today is ${today}).
- journal: put what the user wants to write into body. Short title if obvious.
- search_archive: extract only the search query.
- unknown: if unclear.
Return JSON only per schema.`;

    const chatRes = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: transcript },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "voice_action",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                type: {
                  type: "string",
                  enum: ["task", "journal", "search_archive", "unknown"],
                },
                title: { type: ["string", "null"] },
                body: { type: ["string", "null"] },
                priority: {
                  type: ["string", "null"],
                  enum: ["high", "medium", "low", null],
                },
                due_date: { type: ["string", "null"] },
                description: { type: ["string", "null"] },
                query: { type: ["string", "null"] },
                reason: { type: ["string", "null"] },
              },
              required: [
                "type",
                "title",
                "body",
                "priority",
                "due_date",
                "description",
                "query",
                "reason",
              ],
            },
          },
        },
      }),
    });
    if (!chatRes.ok) {
      const errText = await chatRes.text().catch(() => "");
      throw new Error(`Interpretation failed [${chatRes.status}]: ${errText}`);
    }
    const chatJson = (await chatRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = chatJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { type: "unknown", reason: "parse_error" };
    }

    // Normalize into discriminated union
    let action: VoiceResult["action"];
    if (parsed.type === "task" && parsed.title) {
      action = {
        type: "task",
        title: parsed.title,
        priority: (parsed.priority as any) || "medium",
        due_date: parsed.due_date ?? null,
        description: parsed.description ?? null,
      };
    } else if (parsed.type === "journal" && parsed.body) {
      action = { type: "journal", title: parsed.title ?? null, body: parsed.body };
    } else if (parsed.type === "search_archive" && parsed.query) {
      action = { type: "search_archive", query: parsed.query };
    } else {
      action = { type: "unknown", reason: parsed.reason ?? undefined };
    }

    return { transcript, action };
  });
