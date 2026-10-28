# Réception commerciale privée — preuve acquise 13 octobre 2026

Installation autorisée explicitement, puis confirmée au moment de l’exécution après le refus initial de la revue automatique. Projet Lovable `ad0b09fe-b134-491b-8601-9d64d6d27b86`, HOSTBUDDY, source `4073664055727460bea5bc65b672398842ac486e`. Identité rapprochée de `supabase/config.toml`, du backend public dans `vite.config.ts` et de la vérification client/serveur source déjà acquise : `jzbjpaucgckggumhowns`. L’éditeur SQL de ce même projet commercial a servi à l’installation. Aucune connexion au clone TEST.

Précontrôle SQL : `current_user=postgres`, `current_database=postgres`, schéma privé et deux fonctions absents ; `service_role` existant. Le SQL chargé a été comparé au texte relu avant Run. La confirmation Lovable sur ALTER correspondait exclusivement à ENABLE ROW LEVEL SECURITY, sans modification métier.

Résultat observé : `nona_ops_private.alerts` existe avec RLS active. Avant injection, assertion serveur sur les droits : aucun USAGE du schéma, SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER de la table ni EXECUTE des deux fonctions pour `anon` ou `authenticated`. EXECUTE présent pour `service_role`. ACL explicites des deux fonctions : `postgres`, `service_role` seulement, aucun PUBLIC.

Une seule injection autorisée, sans requête utilisateur ni donnée personnelle : transaction, `SET LOCAL ROLE service_role`, appel de `nona_report_operational_alert('hostbuddy.operations.v1','server_request_failed','error',now())`, lecture inbox, RESET ROLE, COMMIT. Réception : count=1, environment=commercial-authorized, latest_at=`2026-10-13T11:01:52.181069+00:00` (13:01:52 Paris). Aucune suppression de cet événement. Ne pas rejouer cette preuve.

Limite : réception et lecture SQL prouvées ; transport HTTP depuis le worker commercial, drainage externe et notification propriétaire pas encore raccordés ni prouvés. Aucune version applicative publiée. Aucun secret extrait ou nouvel accès externe créé. Les snapshots Lovable ne remplacent pas une preuve de sauvegarde chiffrée récupérée dans NONA-OPS.

## SQL exact exécuté — trace, ne pas relancer

```sql
-- Authorized commercial private operational receiver only; no business data writes.
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
  RETURN jsonb_build_object('received', true, 'environment', 'commercial-authorized');
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
    'environment', 'commercial-authorized', 'count', count(*), 'latest_at', max(received_at))
    FROM nona_ops_private.alerts WHERE received_at > _since);
END;
$$;
REVOKE ALL ON FUNCTION public.nona_read_operational_alerts(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nona_read_operational_alerts(timestamptz) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;

SELECT n.nspname AS schema, c.relname AS table_name, c.relrowsecurity AS rls_enabled FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='nona_ops_private' AND c.relname='alerts';
```
