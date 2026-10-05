-- Requires 20261003_data_safety.sql. Run before deploying Booking Form editor.
BEGIN;
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
