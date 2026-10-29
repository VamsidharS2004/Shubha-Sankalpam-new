-- Promo codes (admin: Promo Codes tab). Run once in the Supabase SQL editor (safe to re-run).
-- Usage is counted from the bookings table (each promo booking has a "Promo: {...}" line in its notes),
-- so no second table is needed.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ss_promo_codes (
  code text PRIMARY KEY,
  kind text NOT NULL DEFAULT 'percent' CHECK (kind IN ('percent','flat')),
  value integer NOT NULL CHECK (value >= 1),
  max_off integer NOT NULL DEFAULT 0,
  scope text NOT NULL DEFAULT 'all' CHECK (scope IN ('all','selected')),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  audience text NOT NULL DEFAULT 'anyone' CHECK (audience IN ('anyone','first_time','phone')),
  phone text,
  max_uses integer NOT NULL DEFAULT 0,
  per_user integer NOT NULL DEFAULT 1,
  starts_at timestamptz,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ss_promo_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ss_promo_codes FROM anon, authenticated;
GRANT ALL ON public.ss_promo_codes TO service_role;
COMMENT ON TABLE public.ss_promo_codes IS 'Discount codes created in the admin panel. Read/written only by the server (service role).';
COMMIT;
