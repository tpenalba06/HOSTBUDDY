ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_setup_completed_at timestamptz;

COMMENT ON COLUMN public.organizations.contact_email IS 'Default guest-facing email inherited by new properties.';
COMMENT ON COLUMN public.organizations.contact_phone IS 'Default guest-facing phone/WhatsApp inherited by new properties.';
