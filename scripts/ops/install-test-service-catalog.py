"""Individually authorized isolated TEST service migration and rollback fixtures.
No production target, Stripe call, secret output or customer data mutation.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('service_test_pg', Path(__file__).with_name('database-backup.py'))
pg = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(pg)


def run(connection_file, ca_file):
    value = pg.connection(json.loads(pg.private_read(connection_file, 8192)), 'mhhtnqfdkyudwyqlmnce')
    ca = pg.private_read(ca_file, 20480)
    pg.validate_ca(ca)
    binary = shutil.which('psql', path='/usr/lib/postgresql/17/bin:/usr/bin:/bin')
    if not binary:
        raise ValueError('test_psql_required')
    migration = ROOT / 'drizzle/migrations/0023_service_booking_catalog.sql'
    manifest = json.loads((migration.parent / 'meta/manifest.json').read_text())
    digest = hashlib.sha256(migration.read_bytes()).hexdigest()
    if not any(item['tag'] == migration.stem and item['sha256'] == digest for item in manifest['migrations']):
        raise ValueError('test_migration_manifest_mismatch')
    with tempfile.TemporaryDirectory(prefix='nona-test-services-') as directory:
        env = pg.pg_environment(value, Path(directory), ca)
        env['PGAPPNAME'] = 'nona-isolated-service-catalog'
        env['PGOPTIONS'] = '-c statement_timeout=30000 -c lock_timeout=5000'

        def execute(sql, tuples=False):
            options = ['--no-psqlrc', '--quiet', '--set', 'ON_ERROR_STOP=1']
            if tuples:
                options.extend(['--tuples-only', '--no-align'])
            result = subprocess.run([binary, *options], input=sql.encode(), env=env, capture_output=True, timeout=45)
            if result.returncode:
                raise ValueError('isolated_service_sql_failed')
            return result.stdout.decode().strip()

        # Refuse an unknown baseline and refuse reinstalling a partially applied
        # schema. A failed transaction leaves this migration unapplied.
        baseline = execute("SELECT to_regprocedure('public.record_billing_capacity(uuid,uuid,bigint,jsonb)') IS NOT NULL;", True)
        present = execute("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='services' AND column_name='booking_config');", True)
        if baseline != 't':
            raise ValueError('isolated_service_baseline_required')
        applied = False
        if present == 'f':
            execute(migration.read_text())
            execute("NOTIFY pgrst, 'reload schema';")
            applied = True
        elif present != 't':
            raise ValueError('isolated_service_catalog_unknown')
        required = execute("SELECT to_regprocedure('public.submit_service_booking(text,uuid,text,text,integer,timestamptz,text,uuid,text,uuid,text,boolean,timestamptz)') IS NOT NULL AND to_regprocedure('public.save_service_catalog(uuid,uuid,uuid,jsonb)') IS NOT NULL AND to_regprocedure('public.read_service_booking_request(uuid,text)') IS NOT NULL;", True)
        if required != 't':
            raise ValueError('isolated_service_catalog_incomplete')
        execute((ROOT / 'scripts/validation/service-booking-test.sql').read_text())
        return {'schema': 'nona.service-catalog-test.v1', 'project_ref': 'mhhtnqfdkyudwyqlmnce', 'status': 'PASS', 'migration_applied': applied, 'fixtures_rolled_back': True, 'quote_dedup_receipt_tenant_checks': True, 'stripe_payment_executed': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--connection-file', required=True)
    parser.add_argument('--ca-file', required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(run(args.connection_file, args.ca_file)))
    except Exception:
        print('{"schema":"nona.service-catalog-test.v1","status":"FAIL","code":"isolated_test_service_preparation_failed"}')
        raise SystemExit(1) from None
