ALTER TABLE public.learning_items ADD COLUMN IF NOT EXISTS rating smallint;
ALTER TABLE public.learning_items DROP CONSTRAINT IF EXISTS learning_items_rating_check;
ALTER TABLE public.learning_items ADD CONSTRAINT learning_items_rating_check CHECK (rating IS NULL OR rating IN (-1, 1, 2));