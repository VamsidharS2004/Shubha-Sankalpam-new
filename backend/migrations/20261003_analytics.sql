-- Run after 20261003_data_safety.sql and before deploying analytics tracking.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ss_analytics_events (
  id uuid PRIMARY KEY,
  visitor_id uuid NOT NULL,
  session_id uuid NOT NULL,
  event_type text NOT NULL CHECK(event_type IN ('page_view','puja_view')),
  page text NOT NULL,
  puja_id text,
  puja_name text,
  language text NOT NULL CHECK(language IN ('en','te','hi')),
  device text NOT NULL CHECK(device IN ('mobile','tablet','desktop')),
  referrer text NOT NULL DEFAULT 'Direct',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ss_analytics_date_idx ON public.ss_analytics_events(created_at);
CREATE INDEX IF NOT EXISTS ss_analytics_visitor_date_idx ON public.ss_analytics_events(visitor_id,created_at);
ALTER TABLE public.ss_analytics_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ss_analytics_events FROM anon, authenticated;
GRANT ALL ON public.ss_analytics_events TO service_role;
COMMENT ON TABLE public.ss_analytics_events IS 'First-party pseudonymous visits. Stores no auth tokens, phone numbers, full referrer URLs or query strings. Not financial accounting.';
COMMIT;
