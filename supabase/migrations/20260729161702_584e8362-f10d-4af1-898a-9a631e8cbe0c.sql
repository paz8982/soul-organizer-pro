ALTER TABLE public.archive_items
  ADD COLUMN IF NOT EXISTS content_text text,
  ADD COLUMN IF NOT EXISTS content_indexed_at timestamptz,
  ADD COLUMN IF NOT EXISTS content_status text NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS archive_items_content_status_idx
  ON public.archive_items (user_id, content_status);