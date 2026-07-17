-- Allowlist table
CREATE TABLE public.allowed_emails (
  email text PRIMARY KEY,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.allowed_emails TO authenticated;
GRANT ALL ON public.allowed_emails TO service_role;

ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

-- No client-side policies: only service_role (backend/admin) can read/write.
-- The trigger below runs as SECURITY DEFINER so it bypasses RLS.

CREATE OR REPLACE FUNCTION public.enforce_email_allowlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.allowed_emails
    WHERE lower(email) = lower(NEW.email)
  ) THEN
    RAISE EXCEPTION 'Signups are restricted. Contact the app owner to request access.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_email_allowlist_trigger
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_email_allowlist();
