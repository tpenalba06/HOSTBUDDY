"""Prepared commercial receiver setup/read; private approval required first.
No execution, credential creation or production activation during preparation.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import tempfile


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def approval(value):
    if value != {'schema': 'nona.commercial-alert-approval.v1', 'authorized': True,
        'project_ref': 'jzbjpaucgckggumhowns', 'destination_repository': 'tpenalba06/NONA-OPS',
        'scope': 'private-service-role-only-alert-receiver-and-notification'}:
        raise ValueError('commercial_alerts_not_authorized')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['setup', 'read'])
    parser.add_argument('--approval-file', required=True)
    parser.add_argument('--connection-file')
    parser.add_argument('--ca-file')
    parser.add_argument('--api-key-file')
    args = parser.parse_args()
    try:
        installer = load('commercial_alert_installer', 'install-test-alert-receiver.py')
        approval(json.loads(installer.backup.private_read(args.approval_file, 4096)))
        if args.action == 'setup':
            installer.backup.TEST_REF = 'jzbjpaucgckggumhowns'
            with tempfile.TemporaryDirectory(prefix='nona-commercial-alert-') as temp:
                sql = Path(temp) / 'receiver.sql'
                sql.write_text(Path(__file__).with_name('test-alert-receiver.sql').read_text().replace("'isolated-test'", "'commercial-authorized'"))
                sql.chmod(0o600)
                installer.install(args.connection_file, args.ca_file, sql)
            result = {'schema': 'nona.alert-setup.v1', 'environment': 'commercial-authorized', 'status': 'PASS'}
        else:
            inbox = load('commercial_alert_inbox', 'test-alert-inbox.py')
            key = inbox.health.private_key(args.api_key_file)
            result = inbox.check(key, os.environ.get('GITHUB_TOKEN', ''),
                'https://jzbjpaucgckggumhowns.supabase.co', 'commercial-authorized')
        print(json.dumps(result))
        return 0 if result['status'] == 'PASS' else 1
    except Exception:
        print('{"schema":"nona.alert-inbox.v1","environment":"commercial-preparation","status":"BLOCKED","code":"commercial_alert_configuration_or_approval_required"}')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
