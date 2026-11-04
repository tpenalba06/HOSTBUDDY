"""Explicit isolated TEST ops setup. Never a production/application migration."""
import argparse
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

spec = importlib.util.spec_from_file_location('backup', Path(__file__).with_name('database-backup.py'))
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)


def install(connection_file, ca_file, sql_file=None):
    value = backup.connection(json.loads(backup.private_read(connection_file, 8192)), backup.TEST_REF)
    ca = backup.private_read(ca_file, 20480)
    backup.validate_ca(ca)
    binary = shutil.which('psql', path='/usr/lib/postgresql/17/bin:/usr/bin:/bin')
    if not binary:
        raise ValueError('psql_required')
    sql = Path(sql_file) if sql_file else Path(__file__).with_name('test-alert-receiver.sql')
    with tempfile.TemporaryDirectory(prefix='nona-test-alert-') as directory:
        env = backup.pg_environment(value, Path(directory), ca)
        env['PGAPPNAME'] = 'nona-isolated-alert-setup'
        # Only this explicit installer can run DDL. The backup remains read-only.
        env['PGOPTIONS'] = '-c statement_timeout=30000 -c lock_timeout=5000'
        result = subprocess.run([binary, '--no-psqlrc', '--quiet', '--set', 'ON_ERROR_STOP=1', '--file', str(sql)],
                                env=env, capture_output=True, timeout=45)
        if result.returncode:
            raise ValueError('receiver_setup_failed')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--connection-file', required=True)
    parser.add_argument('--ca-file', required=True)
    args = parser.parse_args()
    try:
        install(args.connection_file, args.ca_file)
        print('{"schema":"nona.alert-setup.v1","environment":"isolated-test","status":"PASS"}')
    except Exception:
        print('{"schema":"nona.alert-setup.v1","environment":"isolated-test","status":"FAIL","code":"receiver_setup_failed"}')
        raise SystemExit(1) from None
