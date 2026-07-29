import type { ArchiveRow } from "./archive-extract.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export type SmartMatch = { id: string; reason: string };

function fmtDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

/** Ask the AI which archive items answer the user's natural-language question. */
export async function rankArchiveItems(
  query: string,
  locale: "he" | "en",
  rows: ArchiveRow[],
): Promise<{ matches: SmartMatch[]; answer: string | null }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
  if (rows.length === 0) return { matches: [], answer: null };

  const today = new Date().toISOString().slice(0, 10);
  const catalog = rows
    .map((r) => {
      const content = (r.content_text ?? "").slice(0, 1200);
      return [
        `### ${r.id}`,
        `saved: ${fmtDate(r.created_at)} | type: ${r.item_type}`,
        `title: ${r.title}`,
        r.description ? `description: ${r.description}` : null,
        r.tags?.length ? `tags: ${r.tags.join(", ")}` : null,
        r.notes ? `notes: ${r.notes.slice(0, 400)}` : null,
        r.url ? `url: ${r.url}` : null,
        content ? `content: ${content}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const sys =
    locale === "he"
      ? `אתה מנוע חיפוש חכם לארכיון אישי. היום ${today}.
קיבלת רשימת פריטים עם התוכן שחולץ מהקישורים והקבצים שלהם.
בחר רק את הפריטים שבאמת עונים לשאלה של המשתמש (כולל אילוצי זמן כמו "בחודש שעבר").
עבור כל פריט תן נימוק קצר מאוד בעברית. אם אין התאמות, החזר רשימה ריקה.
answer: משפט קצר אחד בעברית שמסכם את התוצאות.
החזר JSON בלבד.`
      : `You are a smart search engine over a personal archive. Today is ${today}.
You get a list of items with content extracted from their links and files.
Return only items that genuinely answer the user's question (respect time constraints like "last month").
Give a very short reason per item. If nothing matches, return an empty list.
answer: one short sentence summarizing the results.
Return JSON only.`;

  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Question: ${query}\n\nItems:\n${catalog}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "archive_matches",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              answer: { type: ["string", "null"] },
              matches: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: { id: { type: "string" }, reason: { type: "string" } },
                  required: ["id", "reason"],
                },
              },
            },
            required: ["answer", "matches"],
          },
        },
      },
    }),
  });

  if (!res.ok) throw new Error(`AI search failed (${res.status})`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  let parsed: { answer?: string | null; matches?: SmartMatch[] } = {};
  try {
    parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
  } catch {
    /* ignore */
  }
  const valid = new Set(rows.map((r) => r.id));
  return {
    answer: parsed.answer ?? null,
    matches: (parsed.matches ?? []).filter((m) => m && valid.has(m.id)).slice(0, 30),
  };
}
