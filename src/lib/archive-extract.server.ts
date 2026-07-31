import { isFacebookUrl, resolveFacebookLink } from "./facebook-resolve.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

const MAX_CHARS = 12_000;

export type ArchiveRow = {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  tags: string[] | null;
  item_type: string;
  url: string | null;
  file_path: string | null;
  file_mime: string | null;
  created_at: string;
  content_text?: string | null;
};

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function describeWithAi(
  apiKey: string,
  parts: Array<Record<string, unknown>>,
): Promise<string> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You extract searchable content from a saved document or image. Write a dense plain-text summary (max 250 words) covering: what it is, the main topic, key entities, ingredients/steps/names/numbers if present, and any visible text. Keep the original language of the content; if it is Hebrew, answer in Hebrew. No markdown, no preamble.",
        },
        { role: "user", content: parts },
      ],
    }),
  });
  if (!res.ok) return "";
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

/** Extract searchable text for an archive item (link page text, file/image content). */
export async function extractArchiveContent(
  item: ArchiveRow,
  supabase: any,
): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  const chunks: string[] = [];

  if (item.url && isFacebookUrl(item.url)) {
    const fb = await resolveFacebookLink(item.url);
    if (fb.caption) chunks.push(fb.caption);
  } else if (item.url) {
    try {
      const res = await fetch(item.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SecondBrainBot/1.0; +https://lovable.app)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      if (res.ok) {
        const ct = res.headers.get("content-type") ?? "";
        const body = await res.text();
        chunks.push(ct.includes("html") ? htmlToText(body) : body);
      }
    } catch {
      /* unreachable link — keep metadata only */
    }
  }

  if (item.file_path && apiKey) {
    try {
      const { data: blob } = await supabase.storage.from("archive").download(item.file_path);
      if (blob) {
        const mime = item.file_mime ?? blob.type ?? "application/octet-stream";
        const buf = new Uint8Array(await blob.arrayBuffer());
        if (mime.startsWith("text/") || mime.includes("json") || mime.includes("csv")) {
          chunks.push(new TextDecoder().decode(buf));
        } else if (buf.byteLength <= 8_000_000) {
          let bin = "";
          for (let i = 0; i < buf.length; i += 0x8000) {
            bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
          }
          const b64 = btoa(bin);
          if (mime.startsWith("image/")) {
            chunks.push(
              await describeWithAi(apiKey, [
                { type: "text", text: `File name: ${item.title}` },
                { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
              ]),
            );
          } else {
            chunks.push(
              await describeWithAi(apiKey, [
                { type: "text", text: `File name: ${item.title}` },
                {
                  type: "file",
                  file: { filename: item.title, file_data: `data:${mime};base64,${b64}` },
                },
              ]),
            );
          }
        }
      }
    } catch {
      /* ignore extraction failure */
    }
  }

  return chunks.filter(Boolean).join("\n\n").slice(0, MAX_CHARS);
}
