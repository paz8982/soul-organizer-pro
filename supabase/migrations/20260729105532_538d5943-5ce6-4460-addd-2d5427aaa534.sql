CREATE TABLE public.wear_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Watch',
  token_hash text NOT NULL,
  token_last_four text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX wear_devices_token_hash_idx ON public.wear_devices (token_hash);
CREATE INDEX wear_devices_user_id_idx ON public.wear_devices (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wear_devices TO authenticated;
GRANT ALL ON public.wear_devices TO service_role;

ALTER TABLE public.wear_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own wear devices"
ON public.wear_devices
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_wear_devices_updated_at
BEFORE UPDATE ON public.wear_devices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();