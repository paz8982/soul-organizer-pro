## The problem (verified)

Your archive has ~20 items whose URL is a Facebook share link. When the app fetched them, Facebook returned a login wall — the extracted content for those rows is literally the word `Facebook`. Some rows still got a good Hebrew title/description (from the WhatsApp message text around them), but others are generic, e.g.:

- `סרטון Reels בפייסבוק` / `סרטון קצר (Reel) המשותף ברשת החברתית פייסבוק` / tags `פייסבוק, מדיה חברתית, סרטון, רילס`

## What I found that makes a fix possible

Fetching the share link with Facebook's own crawler user-agent returns the canonical reel URL, and that URL's slug contains the **original Hebrew caption of the video**, plus a **thumbnail image** of the dish. Example (real item from your archive):

```text
share/r/1DHFsjTvd6  →  reel/965892372427132
  → og:url slug: "אצבעות פולנטה ופקורינו איטליאנו מגוררת... רכות מבפנים וק..."
  → og:image: thumbnail JPG of the food
```

That's enough for the AI to write a real title, description and tags.

## Plan

**1. One-time repair of existing Facebook items**

For every archive item with a `facebook.com` / `fb.watch` URL:
- Resolve the share link to its canonical reel/video URL with the crawler user-agent (with a retry, since Facebook sometimes serves an empty page).
- Read the caption from the URL slug and the thumbnail image.
- Send caption + thumbnail to the AI (Gemini, multimodal) and ask for: a real Hebrew title, a one-sentence description, 3–5 recipe-oriented tags, and a dense searchable text blob.
- Write the results back to the database in a single migration, so nothing runs at page load.

Only items that resolve successfully are changed. Items that stay unresolvable (link deleted, private post) keep their current values and I'll list them for you at the end.

Items that already have a good title get updated too — the new data comes from the actual video, so it should be at least as accurate — but I'll keep the existing title if the AI can't do better.

**2. Make it permanent for new Facebook links**

Add a Facebook resolver to the link/archive enrichment pipeline (`src/lib/archive-extract.server.ts` and `src/lib/link-enrich.functions.ts`) so any Facebook link you save from now on — via share, WhatsApp import, or manual add — goes through the same caption + thumbnail path instead of hitting the login wall. This also fills `content_text` properly, so smart search can find these recipes.

## Technical details

- Resolver helper: new `src/lib/facebook-resolve.server.ts` — fetch with `facebookexternalhit` UA, parse `og:url` / `og:image`, URL-decode the slug into caption text, one retry on empty OG.
- Enrichment call: existing gateway pattern (`google/gemini-3-flash-preview`, JSON schema response) with the thumbnail passed as an `image_url` content block.
- Backfill: I run the resolver + AI in the sandbox and apply the results as literal `UPDATE public.archive_items SET title, description, tags, content_text, content_status='indexed'` statements in one migration.
- No schema changes, no new UI.
