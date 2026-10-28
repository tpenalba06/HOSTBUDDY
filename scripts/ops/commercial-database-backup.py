"""Prepared commercial export, blocked without an explicit private approval file.
The acquired TEST tool stays unchanged and rejects commercial refs on its own.
No restore, secret generation, scheduling or activation is performed here.
"""
import argparse
import importlib.util
import json
from pathlib import Path

COMMERCIAL_REF = 'jzbjpaucgckggumhowns'
ORIGIN = 'https://host-buddy-concierge.lovable.app'


def approval(value):
    if not isinstance(value, dict) or value != {
        'schema': 'nona.commercial-backup-approval.v1',
        'authorized': True, 'project_ref': COMMERCIAL_REF,
        'origin': ORIGIN, 'destination_repository': 'tpenalba06/NONA-OPS',
        'scope': 'read-only-database-auth-and-guide-media-export',
    }:
        raise ValueError('commercial_backup_not_authorized')
    return COMMERCIAL_REF


def engine(approval_file):
    # Separate module instance: never loosen the original TEST command or a
    # running TEST job. Shared encryption/export implementation is reused only
    # after validating the individually approved commercial target.
    spec = importlib.util.spec_from_file_location('approved_commercial_export', Path(__file__).with_name('database-backup.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    target = approval(json.loads(module.private_read(approval_file, 4096)))
    module.TEST_REF = target
    return module, target


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['backup', 'verify'])
    parser.add_argument('--approval-file', required=True)
    parser.add_argument('--connection-file')
    parser.add_argument('--ca-file')
    parser.add_argument('--key-file', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    try:
        module, target = engine(args.approval_file)
        key = module.read_key(args.key_file)
        if args.action == 'backup':
            config = json.loads(module.private_read(args.connection_file, 4096))
            module.connection(config, target)
            ca = module.private_read(args.ca_file, 20480)
            module.validate_ca(ca)
            result = module.backup(config, key, target, args.output, 32 * 1024 * 1024, module.clients(), ca)
        else:
            result = module.verify(args.output, key, target, module.clients())
        print(json.dumps({'schema': 'nona.database-backup.v1', 'environment': 'commercial-authorized', **result}))
        return 0
    except Exception:
        print('{"schema":"nona.database-backup.v1","environment":"commercial-preparation","status":"BLOCKED","code":"commercial_backup_configuration_or_approval_required"}')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
