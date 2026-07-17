import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

const inputSchema = z.object({
  url: z.string().url(),
  locale: z.enum(["he", "en"]).default("he"),
});

export type LinkEnrichment = {
  title: string | null;
  description: string | null;
  tags: string[];
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function extractMeta(html: string) {
  const pick = (re: RegExp) => {
    const m = html.match(re);
    return m ? decodeEntities(m[1]).trim() : null;
  };
  const ogTitle =
    pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i);
  const title = ogTitle || pick(/<title[^>]*>([^<]+)<\/title>/i);
  const description =
    pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  // strip scripts/styles and collapse text for AI context
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
  return { title, description, body };
}

export const enrichLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<LinkEnrichment> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    // 1) Fetch page
    let html = "";
    try {
      const res = await fetch(data.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; SecondBrainBot/1.0; +https://lovable.app)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      if (res.ok) html = (await res.text()).slice(0, 200_000);
    } catch {
      /* ignore, we'll fall back */
    }

    const meta = html ? extractMeta(html) : { title: null, description: null, body: "" };

    // 2) Ask AI to produce a clean title + tags in the app's language
    const sys =
      data.locale === "he"
        ? `אתה מסייע לסכם דף אינטרנט לצורך שמירה בארכיון אישי.
- title: כותרת קצרה בעברית שמתארת בבירור את התוכן (למשל שם המתכון, שם המאמר). אם התוכן באנגלית, ניתן להשאיר את הכותרת המקורית.
- description: משפט קצר אחד שמסביר במה מדובר.
- tags: 3 עד 5 תגיות קצרות בעברית, מילה אחת או שתיים לכל תגית, ללא הסולמית.
החזר JSON בלבד לפי הסכימה.`
        : `You summarize a web page for saving in a personal archive.
- title: a short, clear title describing the content (e.g. the recipe name, article title).
- description: one short sentence explaining what it is.
- tags: 3 to 5 short single-word or two-word tags, no # sign.
Return JSON only per schema.`;

    const userMsg = `URL: ${data.url}
Page title: ${meta.title ?? "(none)"}
Meta description: ${meta.description ?? "(none)"}
Content snippet:
${meta.body}`;

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
          { role: "user", content: userMsg },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "link_enrichment",
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

    if (!chatRes.ok) {
      // fall back to raw meta
      return {
        title: meta.title,
        description: meta.description,
        tags: [],
      };
    }
    const chatJson = (await chatRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = chatJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: { title?: string | null; description?: string | null; tags?: string[] } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return {
      title: parsed.title ?? meta.title ?? null,
      description: parsed.description ?? meta.description ?? null,
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.map((t) => String(t).replace(/^#/, "").trim()).filter(Boolean).slice(0, 6)
        : [],
    };
  });
