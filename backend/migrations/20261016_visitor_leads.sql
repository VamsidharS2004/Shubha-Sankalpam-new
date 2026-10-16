-- Visitor leads + 12-month retention. Run once in the Supabase SQL editor (safe to re-run).
BEGIN;
ALTER TABLE public.ss_analytics_events ADD COLUMN IF NOT EXISTS source text;
CREATE TABLE IF NOT EXISTS public.ss_visitor_leads (
  visitor_id uuid PRIMARY KEY,
  name text,
  phone text,
  source text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ss_visitor_leads_phone_idx ON public.ss_visitor_leads(phone);
CREATE INDEX IF NOT EXISTS ss_visitor_leads_seen_idx ON public.ss_visitor_leads(last_seen);
ALTER TABLE public.ss_visitor_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ss_visitor_leads FROM anon, authenticated;
GRANT ALL ON public.ss_visitor_leads TO service_role;
COMMENT ON TABLE public.ss_visitor_leads IS 'Visitors who identified themselves (login/booking). Kept 12 months, then purged by the server.';
COMMIT;
