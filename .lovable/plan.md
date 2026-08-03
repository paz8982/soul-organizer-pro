# Meaningful titles for images saved in the Archive

Today, picking an image in the Archive "file" tab copies the file name into the title, so items end up called things like `IMG_20260803.jpg`. Instead, the title stays empty for you to fill in — and if you leave it empty and hit save, AI looks at the image itself and writes a title, a short description, and tags.

## Behaviour

1. Choosing a file no longer auto-fills the title (for any file type).
2. On save with an empty title:
   - The file uploads first (as it does now).
   - AI inspects the image and returns title + description + tags in the app's current language (Hebrew or English).
   - The AI title fills the title, the description fills the description if you left it empty, and the tags merge into whatever tags you already added (max 8).
   - The save button shows a short "analyzing" state while this runs.
3. If AI fails or the file isn't an image (PDF/doc/other), fall back to the current behaviour: use the file name as the title, so saving never blocks.
4. Link and note tabs are unchanged.

## Technical notes

- New server function `enrichFile` in a new `src/lib/file-enrich.functions.ts`, mirroring `enrichLink`: auth middleware, downloads the uploaded object from the `archive` storage bucket, sends it to the AI gateway as a base64 image block, and returns `{ title, description, tags }` via a strict JSON schema. Same model family already used for link enrichment.
- Called from `src/routes/_authenticated/archive.new.tsx` inside the existing save mutation, after upload and before `createArchiveItem`, guarded on `tab === "file" && !title.trim() && file.type.startsWith("image/")`.
- Remove the `if (!title) setTitle(f.name)` line in the file picker.
- New i18n keys for the "analyzing image" button state in `src/lib/i18n.ts` (he + en).
- Existing post-save `indexArchiveItem` indexing pipeline stays as is.
