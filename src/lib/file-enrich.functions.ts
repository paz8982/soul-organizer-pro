import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

const inputSchema = z.object({
  path: z.string().min(1),
  mime: z.string().min(1),
  filename: z.string().min(1).max(500),
  locale: z.enum(["he", "en"]).default("he"),
});

export type FileEnrichment = {
  title: string | null;
  description: string | null;
  tags: string[];
};

function toBase64(buf: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) {
    bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/** Looks at an uploaded file (image, PDF, doc, text) and suggests a title, description and tags. */
export const enrichFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<FileEnrichment> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const supabase = context.supabase as any;

    const { data: blob, error } = await supabase.storage.from("archive").download(data.path);
    if (error || !blob) throw new Error(error?.message ?? "Download failed");

    const buf = new Uint8Array(await blob.arrayBuffer());
    const mime = data.mime || blob.type || "application/octet-stream";

    const parts: Array<Record<string, unknown>> = [];
    if (mime.startsWith("text/") || mime.includes("json") || mime.includes("csv")) {
      parts.push({
        type: "text",
        text: `File name: ${data.filename}\nFile content:\n${new TextDecoder()
          .decode(buf)
          .slice(0, 12_000)}`,
      });
    } else {
      if (buf.byteLength > 12_000_000) throw new Error("File too large to analyze");
      const b64 = toBase64(buf);
      parts.push({ type: "text", text: `File name: ${data.filename}` });
      if (mime.startsWith("image/")) {
        parts.push({ type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } });
      } else {
        parts.push({
          type: "file",
          file: { filename: data.filename, file_data: `data:${mime};base64,${b64}` },
        });
      }
    }

    const sys =
      data.locale === "he"
        ? `אתה מסייע לתאר קובץ שנשמר בארכיון אישי (תמונה, צילום מסך, PDF או מסמך).
- title: כותרת קצרה וברורה בעברית שמתארת מה יש בקובץ (למשל שם המתכון, נושא המסמך, מה רואים בתמונה). אל תשתמש בשם הקובץ.
- description: משפט קצר אחד שמסביר במה מדובר.
- tags: 3 עד 5 תגיות קצרות בעברית, מילה אחת או שתיים לכל תגית, ללא הסולמית.
החזר JSON בלבד לפי הסכימה.`
        : `You describe a file saved in a personal archive (image, screenshot, PDF or document).
- title: a short, clear title describing what the file contains (e.g. the recipe name, the document topic, what the image shows). Do not use the file name.
- description: one short sentence explaining what it is.
- tags: 3 to 5 short single-word or two-word tags, no # sign.
Return JSON only per schema.`;

    const res = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: parts },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "file_enrichment",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: ["string", "null"] },
                description: { type: ["string", "null"] },
                tags: { type: "array", items: { type: "string" } },
              },
              required: ["title", "description", "tags"],
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI request failed [${res.status}]: ${body}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    let parsed: { title?: string | null; description?: string | null; tags?: string[] } = {};
    try {
      parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
    } catch {
      /* ignore */
    }

    return {
      title: parsed.title?.trim() || null,
      description: parsed.description?.trim() || null,
      tags: Array.isArray(parsed.tags)
        ? parsed.tags
            .map((t) => String(t).replace(/^#/, "").trim())
            .filter(Boolean)
            .slice(0, 6)
        : [],
    };
  });
