/**
 * Facebook links (reels, videos, share links) are behind a login wall for normal
 * user agents, but Facebook still serves Open Graph metadata to its own crawler UA.
 * We use that to recover the real caption, which is usually the whole recipe.
 */

const CRAWLER_UA =
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

export function isFacebookUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return (
      host === "facebook.com" ||
      host.endsWith(".facebook.com") ||
      host === "fb.watch" ||
      host === "fb.com"
    );
  } catch {
    return false;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)));
}

function og(html: string, prop: string): string {
  const m = html.match(
    new RegExp(`<meta property="og:${prop}" content="([^"]*)"`, "i"),
  );
  return m ? decodeEntities(m[1]).trim() : "";
}

function cleanTitle(t: string): string {
  // e.g. "450 reactions · 47 shares | <caption> | Facebook"
  const parts = t.split("|").map((p) => p.trim());
  const meaningful = parts.filter(
    (p) => p && p.toLowerCase() !== "facebook" && !/^\d[\d.,]*\s/.test(p) === true,
  );
  return (meaningful[meaningful.length - 1] ?? t).trim();
}

async function fetchCrawler(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": CRAWLER_UA,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  }
}

export type FacebookMeta = {
  caption: string;
  image: string | null;
  canonical: string | null;
};

/** Resolve a Facebook link to its caption + thumbnail using the crawler UA. */
export async function resolveFacebookLink(url: string): Promise<FacebookMeta> {
  let current = url;
  const seen = new Set<string>();
  let image: string | null = null;
  let canonical: string | null = null;

  for (let hop = 0; hop < 3; hop++) {
    if (!current || seen.has(current)) break;
    seen.add(current);

    const html = await fetchCrawler(current);
    if (!html) break;

    if (!image) image = og(html, "image") || null;
    const next = og(html, "url");
    if (next) canonical = next;

    const title = cleanTitle(og(html, "title"));
    const description = og(html, "description");
    const pieces = [title, description]
      .map((p) => p.trim())
      .filter((p) => p && p.toLowerCase() !== "facebook");
    const caption = Array.from(new Set(pieces)).join("\n");

    if (caption.length > 8) return { caption, image, canonical };

    if (next && !seen.has(next)) {
      current = next;
      continue;
    }
    break;
  }

  return { caption: "", image, canonical };
}
