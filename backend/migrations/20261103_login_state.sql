-- Login OTPs and login sessions that survive across servers (Vercel runs several short-lived copies of the server,
-- so an OTP kept only in one copy's memory looked "expired" when the verify request reached another copy).
-- Run once in the Supabase SQL editor (safe to re-run).
BEGIN;
CREATE TABLE IF NOT EXISTS public.ss_login_otps (
  phone text PRIMARY KEY,
  otp_hash text NOT NULL,
  email text,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ss_login_sessions (
  phone text PRIMARY KEY,
  name text,
  login_time timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now()
);
-- which pujas the devotee opened (shown in the admin dashboard)
ALTER TABLE public.ss_login_sessions ADD COLUMN IF NOT EXISTS viewed_pujas jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS ss_login_sessions_active_idx ON public.ss_login_sessions(last_active_at);
ALTER TABLE public.ss_login_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_login_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ss_login_otps, public.ss_login_sessions FROM anon, authenticated;
GRANT ALL ON public.ss_login_otps, public.ss_login_sessions TO service_role;
COMMIT;
