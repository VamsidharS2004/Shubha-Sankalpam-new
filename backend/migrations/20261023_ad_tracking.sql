-- Ad / social source tracking + booking funnel events. Run once in the Supabase SQL editor (safe to re-run).
-- Run it BEFORE publishing the new code, or the admin Analytics page will ask you to run it.
BEGIN;
ALTER TABLE public.ss_analytics_events ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.ss_analytics_events ADD COLUMN IF NOT EXISTS channel text;
ALTER TABLE public.ss_analytics_events ADD COLUMN IF NOT EXISTS campaign text;
ALTER TABLE public.ss_analytics_events ADD COLUMN IF NOT EXISTS medium text;
ALTER TABLE public.ss_analytics_events ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.ss_analytics_events ADD COLUMN IF NOT EXISTS is_ad boolean NOT NULL DEFAULT false;
ALTER TABLE public.ss_analytics_events ADD COLUMN IF NOT EXISTS is_landing boolean NOT NULL DEFAULT false;
-- allow the booking steps to be recorded too
ALTER TABLE public.ss_analytics_events DROP CONSTRAINT IF EXISTS ss_analytics_events_event_type_check;
ALTER TABLE public.ss_analytics_events ADD CONSTRAINT ss_analytics_events_event_type_check
  CHECK (event_type IN ('page_view','puja_view','checkout_start','booking_created','payment_done'));
CREATE INDEX IF NOT EXISTS ss_analytics_session_idx ON public.ss_analytics_events(session_id);
CREATE INDEX IF NOT EXISTS ss_analytics_ad_idx ON public.ss_analytics_events(created_at) WHERE is_landing;
COMMIT;
