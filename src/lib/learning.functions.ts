import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const client = (ctx: { supabase: unknown }) => ctx.supabase as any;

const formatEnum = z.enum(["video", "audio", "text"]);
const statusEnum = z.enum(["recommended", "saved", "in_progress", "completed", "skipped"]);

export type LearningFormat = z.infer<typeof formatEnum>;
export type LearningStatus = z.infer<typeof statusEnum>;

export type Recommendation = {
  title: string;
  description: string;
  url: string;
  source: string;
  format: LearningFormat;
  duration_minutes: number;
  category: string;
  thumbnail_url?: string | null;
};

// ---------- Categories ----------
export const listLearningCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await client(context)
      .from("learning_categories")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addLearningCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ name: z.string().min(1).max(50) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await client(context)
      .from("learning_categories")
      .insert({ name: data.name.trim(), user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- Items ----------
const itemInput = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  url: z.string().url(),
  source: z.string().nullable().optional(),
  format: formatEnum,
  duration_minutes: z.preprocess(
    (v) => (typeof v === "number" ? Math.round(v) : v),
    z.number().int().positive().nullable().optional(),
  ),
  category: z.string().nullable().optional(),
  thumbnail_url: z.string().nullable().optional(),
  status: statusEnum.default("saved"),
});

export const listLearningItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ status: statusEnum.optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = client(context).from("learning_items").select("*").order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveLearningItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => itemInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await client(context)
      .from("learning_items")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateLearningItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        patch: z
          .object({
            status: statusEnum.optional(),
            reflection: z.string().nullable().optional(),
            completed_at: z.string().nullable().optional(),
          })
          .partial(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await client(context)
      .from("learning_items")
      .update(data.patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteLearningItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await client(context).from("learning_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Recommendations (AI) ----------
const recommendInput = z.object({
  duration_minutes: z.number().int().positive(),
  format: formatEnum,
  category: z.string().min(1),
  locale: z.enum(["he", "en"]),
});

export const recommendLearning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => recommendInput.parse(data))
  .handler(async ({ data }): Promise<{ items: Recommendation[] }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const sys =
      data.locale === "he"
        ? `אתה עוזר שממליץ על תכנים איכותיים ללמידה קצרה. החזר 5 המלצות שונות ואמיתיות ככל האפשר.
- format: ${data.format} (video=YouTube/TED, audio=Podcast/Spotify, text=article/blog)
- קטגוריה: ${data.category}
- משך: חובה שהאורך המלא של הפריט יהיה קטן או שווה ל-${data.duration_minutes} דקות. אל תמליץ על פריט ארוך יותר גם אם הסדרה/הערוץ מתאימים. עבור פודקאסטים בחר פרק ספציפי קצר; עבור וידאו בחר קליפ קצר / TED-Ed / Short; עבור טקסט בחר כתבה שזמן הקריאה שלה מתאים.
כל המלצה: כותרת ותיאור קצר בעברית טבעית, מקור אמין, URL ישיר לפריט הספציפי (לא לערוץ/סדרה), duration_minutes מספרי המשקף את האורך האמיתי, category.
החזר JSON בלבד לפי הסכימה.`
        : `Recommend 5 diverse high-quality short-learning items.
- format: ${data.format} (video=YouTube/TED, audio=Podcast/Spotify, text=article/blog)
- category: ${data.category}
- duration: the item's full length MUST be ≤ ${data.duration_minutes} minutes. Never recommend a longer item, even if the channel/series is a great match. For podcasts pick a specific short episode; for video pick a short clip / TED-Ed / Short; for text pick an article whose read time fits.
Each item: concise title & description, credible source, DIRECT URL to the specific item (not the channel/series), numeric duration_minutes reflecting the real length, category.
Return JSON only per schema.`;

    const res = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `format=${data.format}, category=${data.category}, minutes=${data.duration_minutes}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "recommendations",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      url: { type: "string" },
                      source: { type: "string" },
                      format: { type: "string", enum: ["video", "audio", "text"] },
                      duration_minutes: { type: "number" },
                      category: { type: "string" },
                      thumbnail_url: { type: ["string", "null"] },
                    },
                    required: [
                      "title",
                      "description",
                      "url",
                      "source",
                      "format",
                      "duration_minutes",
                      "category",
                      "thumbnail_url",
                    ],
                  },
                },
              },
              required: ["items"],
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Recommendation failed [${res.status}]: ${txt}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? '{"items":[]}';
    let parsed: { items: Recommendation[] } = { items: [] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { items: [] };
    }

    // Enforce duration budget then validate URLs so we never surface dead / removed media
    // or items longer than the user's requested time.
    const maxMinutes = data.duration_minutes + 1; // small tolerance
    const candidates = (parsed.items ?? [])
      .filter((it) => typeof it.duration_minutes === "number" && it.duration_minutes <= maxMinutes)
      .slice(0, 8);
    const checked = await Promise.all(
      candidates.map(async (item) => ((await isUrlAvailable(item.url)) ? item : null)),
    );
    const available = checked.filter((x): x is Recommendation => x !== null).slice(0, 3);
    return { items: available };
  });

// ---------- In-progress helpers ----------
export const markLearningItemStarted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    // Don't downgrade a completed item; just bump updated_at on it.
    const { data: existing, error: fetchErr } = await client(context)
      .from("learning_items")
      .select("status")
      .eq("id", data.id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    const nextStatus = existing?.status === "completed" ? "completed" : "in_progress";
    const { data: row, error } = await client(context)
      .from("learning_items")
      .update({ status: nextStatus })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const startRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => itemInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await client(context)
      .from("learning_items")
      .insert({ ...data, status: "in_progress", user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- URL availability ----------
function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.slice(1) || null;
    if (host.endsWith("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(?:embed|shorts|v)\/([^/?#]+)/);
      if (m) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

async function isUrlAvailable(url: string): Promise<boolean> {
  try {
    const ytId = extractYouTubeId(url);
    if (ytId) {
      // YouTube blocks HEAD/embed pings for private/removed videos.
      // oEmbed returns 401/404 for unavailable videos, 200 for playable ones.
      const r = await fetch(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
          `https://www.youtube.com/watch?v=${ytId}`,
        )}`,
        { method: "GET" },
      );
      return r.ok;
    }
    // Skip validating search URLs (they always resolve but aren't the content).
    const u = new URL(url);
    if (/^(www\.)?(google|bing|duckduckgo)\./.test(u.hostname) && u.pathname.startsWith("/search")) {
      return false;
    }
    // Generic: try HEAD, fall back to a small GET.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      let r = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SecondBrainBot/1.0)" },
      });
      if (r.status === 405 || r.status === 403) {
        r = await fetch(url, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; SecondBrainBot/1.0)" },
        });
      }
      return r.ok;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

