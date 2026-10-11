-- Shubha Sankalpam: keep every puja / package that was ever offered, even after it is deleted from the website,
-- and add two read-only reports (views) so you can always see which pujas were offered and who booked them.
-- Run this whole file once in the Supabase SQL editor (safe to run again). Requires the earlier data-safety file.
BEGIN;

-- 1) Permanent archive of removed pujas / packages ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ss_puja_archive (
  source_table text NOT NULL CHECK (source_table IN ('cms_pujas','cms_packages')),
  id text NOT NULL,
  name text,
  record jsonb NOT NULL,                      -- the complete puja/package row exactly as it was when deleted
  first_archived_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_table, id)
);
ALTER TABLE public.ss_puja_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ss_puja_archive FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ss_puja_archive TO service_role;

CREATE OR REPLACE FUNCTION public.ss_archive_catalog_row() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.ss_puja_archive(source_table, id, name, record, deleted_at)
  VALUES (TG_TABLE_NAME, OLD.id::text, OLD.name, to_jsonb(OLD), now())
  ON CONFLICT (source_table, id) DO UPDATE
    SET name = EXCLUDED.name, record = EXCLUDED.record, deleted_at = now();
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.ss_archive_catalog_row() FROM PUBLIC, anon, authenticated;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['cms_pujas','cms_packages'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS ss_archive_before_delete ON public.%I', t);
      EXECUTE format('CREATE TRIGGER ss_archive_before_delete BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ss_archive_catalog_row()', t);
    END IF;
  END LOOP;
END $$;

-- Pujas / packages that were already deleted earlier are recovered from the change history.
INSERT INTO public.ss_puja_archive(source_table, id, name, record, deleted_at)
SELECT DISTINCT ON (h.table_name, h.old_record->>'id')
       h.table_name, h.old_record->>'id', h.old_record->>'name', h.old_record, h.recorded_at
FROM public.ss_record_history h
WHERE h.operation = 'DELETE' AND h.table_name IN ('cms_pujas','cms_packages')
  AND h.old_record ? 'id' AND coalesce(h.old_record->>'id','') <> ''
ORDER BY h.table_name, h.old_record->>'id', h.recorded_at DESC
ON CONFLICT (source_table, id) DO NOTHING;

-- 2) Report: one row per booking, with everything the devotee submitted ------------------------------
CREATE OR REPLACE VIEW public.ss_booking_report AS
SELECT
  b.id                                                        AS booking_uuid,
  substring(b.notes from 'BookingID:[[:space:]]*([0-9]{6})')  AS booking_id,
  substring(b.notes from '(?n)^Puja:[[:space:]]*(.*)$')        AS puja_name,
  b.created_at,
  b.status,
  b.payment_status,
  b.price,
  b.devotee_phone,
  substring(b.notes from '(?n)^WhatsApp:[[:space:]]*([0-9]+)') AS whatsapp,
  (SELECT string_agg(n.name,  ', ') FROM public.booking_names n WHERE n.booking_id = b.id) AS devotee_names,
  (SELECT string_agg(n.gotra, ', ') FROM public.booking_names n WHERE n.booking_id = b.id) AS gotram,
  substring(b.notes from '(?n)^Family:[[:space:]]*(.*)$')      AS family_members,
  b.video_url,
  b.notes                                                     AS all_submitted_details
FROM public.bookings b;

-- 3) Report: one row per puja ever offered, with how many people booked it ----------------------------
CREATE OR REPLACE VIEW public.ss_puja_summary AS
WITH booked AS (
  SELECT puja_name,
         count(*)                                                                            AS total_bookings,
         count(*) FILTER (WHERE lower(coalesce(status,'')) NOT IN ('pending','failed','cancelled','canceled','payment-pending')) AS confirmed_bookings,
         coalesce(sum(price) FILTER (WHERE lower(coalesce(status,'')) NOT IN ('pending','failed','cancelled','canceled','payment-pending')), 0) AS confirmed_amount,
         min(created_at)                                                                     AS first_booking,
         max(created_at)                                                                     AS last_booking
  FROM public.ss_booking_report
  GROUP BY puja_name
),
catalog AS (
  SELECT 'puja'::text AS kind, p.id::text AS id, p.name, true AS on_website, NULL::timestamptz AS deleted_at FROM public.cms_pujas p
  UNION ALL
  SELECT 'package', k.id::text, k.name, true, NULL FROM public.cms_packages k
  UNION ALL
  SELECT CASE a.source_table WHEN 'cms_pujas' THEN 'puja' ELSE 'package' END, a.id, a.name, false, a.deleted_at
  FROM public.ss_puja_archive a
  WHERE NOT EXISTS (SELECT 1 FROM public.cms_pujas p    WHERE a.source_table = 'cms_pujas'    AND p.id::text = a.id)
    AND NOT EXISTS (SELECT 1 FROM public.cms_packages k WHERE a.source_table = 'cms_packages' AND k.id::text = a.id)
)
SELECT c.kind, c.id, c.name, c.on_website, c.deleted_at,
       coalesce(b.total_bookings, 0)     AS total_bookings,
       coalesce(b.confirmed_bookings, 0) AS confirmed_bookings,
       coalesce(b.confirmed_amount, 0)   AS confirmed_amount,
       b.first_booking, b.last_booking
FROM catalog c LEFT JOIN booked b ON b.puja_name = c.name
UNION ALL
SELECT 'unknown', NULL, b.puja_name, false, NULL, b.total_bookings, b.confirmed_bookings, b.confirmed_amount, b.first_booking, b.last_booking
FROM booked b
WHERE NOT EXISTS (SELECT 1 FROM catalog c WHERE c.name = b.puja_name);

REVOKE ALL ON public.ss_booking_report, public.ss_puja_summary FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ss_booking_report, public.ss_puja_summary TO service_role;

COMMIT;

-- HOW TO USE (Supabase > SQL editor):
--   select * from ss_puja_summary order by total_bookings desc;                      -- every puja ever offered + booking counts
--   select * from ss_booking_report where puja_name = 'puja name' order by created_at; -- who booked one puja, with all their details
--   select * from ss_puja_archive order by deleted_at desc;                          -- full copies of deleted pujas
