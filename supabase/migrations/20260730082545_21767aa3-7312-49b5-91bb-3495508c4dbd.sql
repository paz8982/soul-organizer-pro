ALTER TABLE public.wear_devices
  ADD COLUMN IF NOT EXISTS pairing_code text,
  ADD COLUMN IF NOT EXISTS pairing_code_expires_at timestamp with time zone;

CREATE UNIQUE INDEX IF NOT EXISTS wear_devices_pairing_code_key
  ON public.wear_devices (pairing_code)
  WHERE pairing_code IS NOT NULL;