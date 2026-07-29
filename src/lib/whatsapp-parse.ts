import { unzipSync, strFromU8 } from "fflate";

export type ParsedLink = {
  url: string;
  title: string;
  notes: string | null;
  created_at: string | null;
  sender: string | null;
};

const MARKS = /[\u200e\u200f\u202a-\u202e]/g;

const LINE_BRACKET = /^\[(\d{1,2})[./-](\d{1,2})[./-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AaPp])\.?[Mm]\.?)?\]\s*([^:]{1,60}):\s*([\s\S]*)$/;
const LINE_DASH = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AaPp])\.?[Mm]\.?)?\s+-\s+([^:]{1,60}):\s*([\s\S]*)$/;

const URL_RE = /https?:\/\/[^\s<>"'\u200e\u200f]+/gi;

function toIso(
  d: string,
  m: string,
  y: string,
  hh: string,
  mm: string,
  ss: string | undefined,
  ampm: string | undefined,
): string | null {
  let year = parseInt(y, 10);
  if (year < 100) year += 2000;
  let hour = parseInt(hh, 10);
  if (ampm) {
    const pm = ampm.toLowerCase() === "p";
    if (pm && hour < 12) hour += 12;
    if (!pm && hour === 12) hour = 0;
  }
  // WhatsApp exports use the device locale; Israeli exports are day-first.
  const day = parseInt(d, 10);
  const month = parseInt(m, 10);
  if (month > 12 || day > 31) return null;
  const date = new Date(year, month - 1, day, hour, parseInt(mm, 10), ss ? parseInt(ss, 10) : 0);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getTime() > Date.now()) return null;
  return date.toISOString();
}

function cleanUrl(raw: string): string {
  let url = raw.replace(MARKS, "").trim();
  // strip trailing punctuation that usually belongs to the sentence
  url = url.replace(/[.,;:!?)\]}"'׳״]+$/g, "");
  return url;
}

function titleFor(text: string, url: string): string {
  const rest = text.replace(url, " ").replace(/\s+/g, " ").trim();
  if (rest.length >= 3) return rest.slice(0, 200);
  try {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname)
      .split("/")
      .filter(Boolean)
      .pop();
    const host = u.hostname.replace(/^www\./, "");
    return path ? `${host} — ${path.replace(/[-_]+/g, " ").slice(0, 120)}` : host;
  } catch {
    return url.slice(0, 200);
  }
}

/** Parses a WhatsApp `_chat.txt` export into link candidates. */
export function parseWhatsappChat(raw: string): ParsedLink[] {
  const text = raw.replace(/\r\n/g, "\n").replace(MARKS, "");
  const lines = text.split("\n");

  type Msg = { date: string | null; sender: string | null; body: string };
  const messages: Msg[] = [];

  for (const line of lines) {
    const m = LINE_BRACKET.exec(line) ?? LINE_DASH.exec(line);
    if (m) {
      messages.push({
        date: toIso(m[1], m[2], m[3], m[4], m[5], m[6], m[7]),
        sender: m[8].trim(),
        body: m[9] ?? "",
      });
    } else if (messages.length > 0) {
      messages[messages.length - 1].body += "\n" + line;
    } else if (line.trim()) {
      messages.push({ date: null, sender: null, body: line });
    }
  }

  const out: ParsedLink[] = [];
  const seen = new Set<string>();

  for (const msg of messages) {
    const found = msg.body.match(URL_RE);
    if (!found) continue;
    for (const rawUrl of found) {
      const url = cleanUrl(rawUrl);
      if (!/^https?:\/\/[^/]+\./i.test(url)) continue;
      if (seen.has(url)) continue;
      seen.add(url);
      const body = msg.body.replace(/\s+/g, " ").trim();
      out.push({
        url,
        title: titleFor(body, rawUrl),
        notes: body.length > 3 ? body.slice(0, 2000) : null,
        created_at: msg.date,
        sender: msg.sender,
      });
    }
  }

  return out;
}

/** Accepts the exported .txt or the whole .zip and returns the chat text. */
export async function readWhatsappExport(file: File): Promise<string> {
  const isZip = file.name.toLowerCase().endsWith(".zip") || file.type === "application/zip";
  if (!isZip) return await file.text();

  const buf = new Uint8Array(await file.arrayBuffer());
  const entries = unzipSync(buf, {
    filter: (f) => f.name.toLowerCase().endsWith(".txt"),
  });
  const names = Object.keys(entries);
  if (names.length === 0) throw new Error("no-txt");
  // prefer the biggest txt (the chat itself)
  names.sort((a, b) => entries[b].length - entries[a].length);
  return strFromU8(entries[names[0]]);
}
