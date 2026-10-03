-- Shubha Sankalpam: data safety, settings, analytics and Booking Form
-- Back up your existing database first. Run this entire file as ONE query.
-- Existing website core tables must already exist. This does not recreate them.
BEGIN;

-- ===== 20261003_data_safety.sql =====
-- Run once in the Supabase SQL editor BEFORE deploying the new admin code.
CREATE TABLE IF NOT EXISTS public.ss_site_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS public.ss_record_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name text NOT NULL,
  operation text NOT NULL,
  old_record jsonb,
  new_record jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ss_site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ss_record_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ss_site_settings, public.ss_record_history FROM anon, authenticated;
GRANT ALL ON public.ss_site_settings, public.ss_record_history TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ss_record_history_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.ss_audit_record() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.ss_record_history(table_name, operation, old_record, new_record)
  VALUES (TG_TABLE_NAME, TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
-- Archive row changes in the SAME transaction as the original write.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['devotees','bookings','booking_names','cms_pujas','cms_packages','cms_temples','cms_translations','ss_site_settings'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS ss_keep_history ON public.%I', t);
      EXECUTE format('CREATE TRIGGER ss_keep_history AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ss_audit_record()', t);
      -- Retain a baseline for records that existed before this migration.
      IF NOT EXISTS (SELECT 1 FROM public.ss_record_history WHERE table_name=t AND operation='BASELINE') THEN
        EXECUTE format('INSERT INTO public.ss_record_history(table_name,operation,new_record) SELECT %L,''BASELINE'',to_jsonb(r) FROM public.%I r',t,t);
      END IF;
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.ss_catalog_read(p_table text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE rows_json jsonb;
BEGIN
  IF p_table NOT IN ('cms_pujas','cms_packages','cms_temples','ss_site_settings') THEN RAISE EXCEPTION 'Unsupported catalog'; END IF;
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id),''[]''::jsonb) FROM public.%I r',p_table) INTO rows_json;
  RETURN jsonb_build_object('rows',rows_json,'revision',md5(rows_json::text));
END;
$$;

CREATE OR REPLACE FUNCTION public.ss_catalog_save(p_table text, p_rows jsonb, p_expected_revision text, p_deleted_ids jsonb DEFAULT '[]'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE current_state jsonb; cols text; assignments text; missing_ids jsonb;
BEGIN
  IF p_table NOT IN ('cms_pujas','cms_packages','cms_temples','ss_site_settings') THEN RAISE EXCEPTION 'Unsupported catalog'; END IF;
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_typeof(p_deleted_ids) <> 'array' THEN RAISE EXCEPTION 'Invalid catalog payload'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('ss_catalog:' || p_table));
  current_state := public.ss_catalog_read(p_table);
  IF p_expected_revision IS NULL OR p_expected_revision <> current_state->>'revision' THEN
    RAISE EXCEPTION 'Catalog changed. Reload this section before saving.' USING ERRCODE='40001';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_rows) r WHERE coalesce(r->>'id','')='') OR
     (SELECT count(*) FROM jsonb_array_elements(p_rows)) <> (SELECT count(DISTINCT r->>'id') FROM jsonb_array_elements(p_rows) r) THEN
    RAISE EXCEPTION 'Every item needs a unique stable ID';
  END IF;
  SELECT coalesce(jsonb_agg(r->>'id'),'[]'::jsonb) INTO missing_ids
  FROM jsonb_array_elements(current_state->'rows') r
  WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_rows) n WHERE n->>'id'=r->>'id');
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(missing_ids) m WHERE NOT (p_deleted_ids ? m)) OR
     EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_deleted_ids) d WHERE NOT (missing_ids ? d)) THEN
    RAISE EXCEPTION 'Removal must be explicitly requested; other records were preserved';
  END IF;
  IF jsonb_array_length(p_rows)>0 THEN
    -- Only keys supplied by our mapper are updated. Unspecified columns retain defaults.
    SELECT string_agg(format('%I',c.column_name),',' ORDER BY c.ordinal_position),
           string_agg(format('%I=EXCLUDED.%I',c.column_name,c.column_name),',' ORDER BY c.ordinal_position) FILTER (WHERE c.column_name<>'id')
    INTO cols, assignments FROM information_schema.columns c
    WHERE c.table_schema='public' AND c.table_name=p_table AND (p_rows->0) ? c.column_name;
    IF assignments IS NULL THEN RAISE EXCEPTION 'No editable fields'; END IF;
    EXECUTE format('INSERT INTO public.%I(%s) SELECT %s FROM jsonb_populate_recordset(NULL::public.%I,$1) ON CONFLICT(id) DO UPDATE SET %s',p_table,cols,cols,p_table,assignments) USING p_rows;
  END IF;
  IF jsonb_array_length(p_deleted_ids)>0 THEN
    -- Audit trigger retains removed rows before the transaction can commit.
    EXECUTE format('DELETE FROM public.%I WHERE id::text IN (SELECT jsonb_array_elements_text($1))',p_table) USING p_deleted_ids;
  END IF;
  RETURN public.ss_catalog_read(p_table);
END;
$$;
REVOKE ALL ON FUNCTION public.ss_catalog_read(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ss_catalog_save(text,jsonb,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ss_audit_record() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ss_catalog_read(text), public.ss_catalog_save(text,jsonb,text,jsonb) TO service_role;

-- ===== 20261003_analytics.sql =====
-- Run after 20261003_data_safety.sql and before deploying analytics tracking.
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

-- ===== 20261003_booking_form.sql =====
-- Requires 20261003_data_safety.sql. Run before deploying Booking Form editor.
CREATE TABLE IF NOT EXISTS public.ss_booking_forms(id integer PRIMARY KEY CHECK(id=1),config jsonb NOT NULL);
ALTER TABLE public.ss_booking_forms ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ss_booking_forms FROM anon,authenticated;
GRANT ALL ON public.ss_booking_forms TO service_role;
DROP TRIGGER IF EXISTS ss_keep_history ON public.ss_booking_forms;
CREATE TRIGGER ss_keep_history AFTER INSERT OR UPDATE OR DELETE ON public.ss_booking_forms FOR EACH ROW EXECUTE FUNCTION public.ss_audit_record();
CREATE OR REPLACE FUNCTION public.ss_catalog_read(p_table text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE rows_json jsonb;
BEGIN
  IF p_table NOT IN ('cms_pujas','cms_packages','cms_temples','ss_site_settings','ss_booking_forms') THEN RAISE EXCEPTION 'Unsupported catalog'; END IF;
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id),''[]''::jsonb) FROM public.%I r',p_table) INTO rows_json;
  RETURN jsonb_build_object('rows',rows_json,'revision',md5(rows_json::text));
END;
$$;

CREATE OR REPLACE FUNCTION public.ss_catalog_save(p_table text, p_rows jsonb, p_expected_revision text, p_deleted_ids jsonb DEFAULT '[]'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE current_state jsonb; cols text; assignments text; missing_ids jsonb;
BEGIN
  IF p_table NOT IN ('cms_pujas','cms_packages','cms_temples','ss_site_settings','ss_booking_forms') THEN RAISE EXCEPTION 'Unsupported catalog'; END IF;
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_typeof(p_deleted_ids) <> 'array' THEN RAISE EXCEPTION 'Invalid catalog payload'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('ss_catalog:' || p_table));
  current_state := public.ss_catalog_read(p_table);
  IF p_expected_revision IS NULL OR p_expected_revision <> current_state->>'revision' THEN
    RAISE EXCEPTION 'Catalog changed. Reload this section before saving.' USING ERRCODE='40001';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_rows) r WHERE coalesce(r->>'id','')='') OR
     (SELECT count(*) FROM jsonb_array_elements(p_rows)) <> (SELECT count(DISTINCT r->>'id') FROM jsonb_array_elements(p_rows) r) THEN
    RAISE EXCEPTION 'Every item needs a unique stable ID';
  END IF;
  SELECT coalesce(jsonb_agg(r->>'id'),'[]'::jsonb) INTO missing_ids
  FROM jsonb_array_elements(current_state->'rows') r
  WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_rows) n WHERE n->>'id'=r->>'id');
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(missing_ids) m WHERE NOT (p_deleted_ids ? m)) OR
     EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_deleted_ids) d WHERE NOT (missing_ids ? d)) THEN
    RAISE EXCEPTION 'Removal must be explicitly requested; other records were preserved';
  END IF;
  IF jsonb_array_length(p_rows)>0 THEN
    -- Only keys supplied by our mapper are updated. Unspecified columns retain defaults.
    SELECT string_agg(format('%I',c.column_name),',' ORDER BY c.ordinal_position),
           string_agg(format('%I=EXCLUDED.%I',c.column_name,c.column_name),',' ORDER BY c.ordinal_position) FILTER (WHERE c.column_name<>'id')
    INTO cols, assignments FROM information_schema.columns c
    WHERE c.table_schema='public' AND c.table_name=p_table AND (p_rows->0) ? c.column_name;
    IF assignments IS NULL THEN RAISE EXCEPTION 'No editable fields'; END IF;
    EXECUTE format('INSERT INTO public.%I(%s) SELECT %s FROM jsonb_populate_recordset(NULL::public.%I,$1) ON CONFLICT(id) DO UPDATE SET %s',p_table,cols,cols,p_table,assignments) USING p_rows;
  END IF;
  IF jsonb_array_length(p_deleted_ids)>0 THEN
    -- Audit trigger retains removed rows before the transaction can commit.
    EXECUTE format('DELETE FROM public.%I WHERE id::text IN (SELECT jsonb_array_elements_text($1))',p_table) USING p_deleted_ids;
  END IF;
  RETURN public.ss_catalog_read(p_table);
END;
$$;

REVOKE ALL ON FUNCTION public.ss_catalog_read(text),public.ss_catalog_save(text,jsonb,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ss_catalog_read(text),public.ss_catalog_save(text,jsonb,text,jsonb) TO service_role;

COMMIT;
