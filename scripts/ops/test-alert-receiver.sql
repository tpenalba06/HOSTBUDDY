-- Isolated TEST only, installed explicitly; never part of app migrations.
BEGIN;
CREATE SCHEMA IF NOT EXISTS nona_ops_private;
REVOKE ALL ON SCHEMA nona_ops_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS nona_ops_private.alerts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event text NOT NULL CHECK (event = 'server_request_failed'),
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE nona_ops_private.alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON nona_ops_private.alerts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.nona_report_operational_alert(
  _schema text, _event text, _level text, _at timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF _schema IS DISTINCT FROM 'hostbuddy.operations.v1' OR
     _event IS DISTINCT FROM 'server_request_failed' OR _level IS DISTINCT FROM 'error' OR
     _at IS NULL OR _at < now() - interval '5 minutes' OR _at > now() + interval '1 minute'
  THEN RAISE EXCEPTION 'invalid_operational_event'; END IF;
  -- A global cap also bounds multiple workers. No request/exception content accepted.
  PERFORM pg_advisory_xact_lock(1852796513, 1);
  IF NOT EXISTS (SELECT 1 FROM nona_ops_private.alerts WHERE received_at > now() - interval '1 minute') THEN
    INSERT INTO nona_ops_private.alerts(event, occurred_at) VALUES (_event, _at);
  END IF;
  RETURN jsonb_build_object('received', true, 'environment', 'isolated-test');
END;
$$;
REVOKE ALL ON FUNCTION public.nona_report_operational_alert(text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nona_report_operational_alert(text,text,text,timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.nona_read_operational_alerts(_since timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF _since IS NULL OR _since > now() + interval '1 minute' OR _since < now() - interval '8 days'
  THEN RAISE EXCEPTION 'invalid_alert_window'; END IF;
  RETURN (SELECT jsonb_build_object('schema', 'nona.alert-inbox.v1',
    'environment', 'isolated-test', 'count', count(*), 'latest_at', max(received_at))
    FROM nona_ops_private.alerts WHERE received_at > _since);
END;
$$;
REVOKE ALL ON FUNCTION public.nona_read_operational_alerts(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nona_read_operational_alerts(timestamptz) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
