-- Customer ID for every devotee: a unique 5-digit number (10001 - 99999), given once when the devotee
-- is created. It can never be edited and is never reused. Run once in the Supabase SQL editor (safe to re-run).
BEGIN;
CREATE SEQUENCE IF NOT EXISTS public.devotee_customer_id_seq START 10001 MINVALUE 10001 MAXVALUE 99999 NO CYCLE;
ALTER TABLE public.devotees ADD COLUMN IF NOT EXISTS customer_id integer;

-- existing devotees get an ID in the order they joined
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.devotees WHERE customer_id IS NULL ORDER BY created_at NULLS FIRST, id LOOP
    UPDATE public.devotees SET customer_id = nextval('public.devotee_customer_id_seq') WHERE id = r.id;
  END LOOP;
END $$;

-- every new devotee gets the next free number automatically
ALTER TABLE public.devotees ALTER COLUMN customer_id SET DEFAULT nextval('public.devotee_customer_id_seq');
ALTER TABLE public.devotees ALTER COLUMN customer_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS devotees_customer_id_key ON public.devotees (customer_id);

-- the number can never be changed afterwards, by the site, the admin panel or a manual edit
CREATE OR REPLACE FUNCTION public.devotees_keep_customer_id() RETURNS trigger AS $$
BEGIN
  NEW.customer_id := OLD.customer_id;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS devotees_keep_customer_id ON public.devotees;
CREATE TRIGGER devotees_keep_customer_id BEFORE UPDATE ON public.devotees
  FOR EACH ROW EXECUTE FUNCTION public.devotees_keep_customer_id();

COMMENT ON COLUMN public.devotees.customer_id IS 'Unique 5-digit customer number shown on the My Profile page and in the admin Devotees list.';
COMMIT;
