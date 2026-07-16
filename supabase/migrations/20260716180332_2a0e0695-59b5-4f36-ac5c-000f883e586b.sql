
CREATE TYPE public.learning_status AS ENUM ('recommended','saved','completed','skipped');
CREATE TYPE public.learning_format AS ENUM ('video','audio','text');

CREATE TABLE public.learning_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  url text NOT NULL,
  source text,
  format public.learning_format NOT NULL DEFAULT 'text',
  duration_minutes integer,
  category text,
  thumbnail_url text,
  status public.learning_status NOT NULL DEFAULT 'saved',
  reflection text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_items TO authenticated;
GRANT ALL ON public.learning_items TO service_role;
ALTER TABLE public.learning_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own learning items" ON public.learning_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_learning_items_updated_at BEFORE UPDATE ON public.learning_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_learning_items_user_status ON public.learning_items(user_id, status, created_at DESC);

CREATE TABLE public.learning_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_categories TO authenticated;
GRANT ALL ON public.learning_categories TO service_role;
ALTER TABLE public.learning_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own learning categories" ON public.learning_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
