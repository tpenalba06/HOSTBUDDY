"""Bounded read-only probes of the isolated TEST. Never print provider bodies."""
import argparse
import datetime
import json
from pathlib import Path
import re
import sys
import time
import urllib.request

TEST_REF = 'mhhtnqfdkyudwyqlmnce'
ORIGIN = 'https://' + TEST_REF + '.supabase.co'
PATHS = {
    'auth_health': '/auth/v1/health',
    'auth_safety': '/auth/v1/settings',
    'private_storage': '/storage/v1/bucket',
    'database_read': '/rest/v1/rpc/get_public_guide?_slug=nona-health-never-published',
}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('redirect_refused')


def private_key(path):
    p = Path(path)
    if p.is_symlink() or not p.is_file() or p.stat().st_mode & 0o077:
        raise ValueError('private_key_required')
    value = p.read_text().strip()
    if not re.fullmatch(r'sb_secret_[A-Za-z0-9_-]{1,250}', value):
        raise ValueError('invalid_test_key')
    return value


class Target:
    def __init__(self, ref, key):
        if ref != TEST_REF or not re.fullmatch(r'sb_secret_[A-Za-z0-9_-]{1,250}', key):
            raise ValueError('isolated_test_required')
        self.key = key
        self.opener = urllib.request.build_opener(NoRedirect())

    def read(self, name):
        path = PATHS[name]
        req = urllib.request.Request(ORIGIN + path, method='GET', headers={'apikey': self.key})
        with self.opener.open(req, timeout=8) as response:
            if response.status != 200:
                raise ValueError('unexpected_status')
            raw = response.read(65537)
        if len(raw) > 65536:
            raise ValueError('oversize_response')
        return json.loads(raw)


def valid(name, value):
    if name == 'auth_health':
        return isinstance(value, dict) and value.get('name') == 'GoTrue'
    if name == 'auth_safety':
        return isinstance(value, dict) and value.get('disable_signup') is True
    if name == 'private_storage':
        return isinstance(value, list) and any(isinstance(b, dict) and b.get('id') == 'guide-media' and b.get('public') is False for b in value)
    if name == 'database_read':
        return value is None
    return False


def probe(target):
    checks = []
    for name in PATHS:
        start = time.monotonic()
        try:
            ok = valid(name, target.read(name))
        except Exception:
            ok = False
        checks.append({'check': name, 'status': 'PASS' if ok else 'FAIL', 'ms': round((time.monotonic() - start) * 1000)})
    return {'schema': 'nona.health.v1', 'environment': 'isolated-test',
            'at': datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z'),
            'status': 'PASS' if all(c['status'] == 'PASS' for c in checks) else 'FAIL', 'checks': checks}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--expected-ref', required=True)
    parser.add_argument('--api-key-file', required=True)
    args = parser.parse_args()
    try:
        result = probe(Target(args.expected_ref, private_key(args.api_key_file)))
    except Exception:
        result = {'schema': 'nona.health.v1', 'environment': 'isolated-test', 'status': 'FAIL', 'code': 'configuration_rejected'}
    print(json.dumps(result))
    return 0 if result['status'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
