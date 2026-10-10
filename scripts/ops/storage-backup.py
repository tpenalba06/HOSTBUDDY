"""Read-only, encrypted media/configuration backup for the isolated Nona TEST.

This supplements a PostgreSQL backup; it does not export database rows or Auth
passwords. No source access, upload, deletion, outgoing email or secret export.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import stat
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

TEST_REF = 'mhhtnqfdkyudwyqlmnce'
MAGIC = b'NONAOPS1'
REPO = Path(__file__).resolve().parents[2]


class BackupError(Exception):
    pass


def private_file(path):
    p = Path(path)
    try:
        # Validate the opened file itself; never follow a credential symlink or
        # let a replacement between stat() and read() bypass the permission check.
        fd = os.open(p, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
        with os.fdopen(fd, 'rb') as stream:
            metadata = os.fstat(stream.fileno())
            if not stat.S_ISREG(metadata.st_mode) or metadata.st_mode & 0o077:
                raise BackupError('private_file_permissions_required')
            return stream.read()
    except OSError:
        raise BackupError('private_file_permissions_required') from None


def key_bytes(path):
    raw = private_file(path)
    if len(raw) == 32:
        return raw
    try:
        key = bytes.fromhex(raw.decode().strip())
    except (ValueError, UnicodeError):
        raise BackupError('invalid_encryption_key') from None
    if len(key) != 32:
        raise BackupError('invalid_encryption_key')
    return key


def safe_configuration(value):
    if isinstance(value, dict):
        for k, v in value.items():
            if isinstance(v, str) and v and re.search(
                r'secret|token|credential|password|private_key|api_key|database_url|authorization', k, re.I
            ):
                raise BackupError('configuration_contains_secret_field')
            safe_configuration(v)
    elif isinstance(value, list):
        for v in value:
            safe_configuration(v)
    elif isinstance(value, str) and re.search(r'sb_secret_|sk_live_|sk_test_|eyJ[A-Za-z0-9_-]{25,}|BEGIN .*PRIVATE KEY', value):
        raise BackupError('configuration_contains_secret_value')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise BackupError('unexpected_api_redirect')


class Target:
    def __init__(self, ref, api_key):
        if ref != TEST_REF:
            raise BackupError('isolated_test_identity_required')
        if not api_key.startswith('sb_secret_'):
            raise BackupError('test_server_key_required')
        self.url = f'https://{ref}.supabase.co'
        self.key = api_key
        self.opener = urllib.request.build_opener(NoRedirect())

    def request(self, path, data=None, limit=256 * 1024 * 1024):
        allowed = path == '/auth/v1/settings' or path == '/storage/v1/bucket' or path.startswith('/storage/v1/object/list/') or path.startswith('/storage/v1/object/authenticated/')
        if not allowed or (data is not None and not path.startswith('/storage/v1/object/list/')):
            raise BackupError('read_only_endpoint_required')
        headers = {'apikey': self.key}
        if data is not None:
            headers['Content-Type'] = 'application/json'
        req = urllib.request.Request(self.url + path, headers=headers,
            data=None if data is None else json.dumps(data).encode(), method='GET' if data is None else 'POST')
        try:
            with self.opener.open(req, timeout=30) as r:
                result = r.read(limit + 1)
        except (urllib.error.URLError, TimeoutError):
            raise BackupError('target_api_read_failed') from None
        if len(result) > limit:
            raise BackupError('backup_size_limit')
        return result

    def json(self, path, data=None):
        return json.loads(self.request(path, data, limit=8 * 1024 * 1024))

    def inventory(self, buckets):
        found = []
        for bucket in buckets:
            stack = ['']; seen = set()
            while stack:
                prefix = stack.pop()
                if prefix in seen:
                    raise BackupError('storage_folder_cycle')
                seen.add(prefix); offset = 0
                while True:
                    rows = self.json('/storage/v1/object/list/' + urllib.parse.quote(bucket['id'], safe=''),
                        {'prefix': prefix, 'limit': 1000, 'offset': offset, 'sortBy': {'column': 'name', 'order': 'asc'}})
                    if not isinstance(rows, list):
                        raise BackupError('invalid_storage_listing')
                    for row in rows:
                        segment = row['name']
                        if segment in ('', '.', '..') or '/' in segment or '\\' in segment:
                            raise BackupError('unsafe_object_name')
                        name = prefix + '/' + segment if prefix else segment
                        if row.get('id') is None:
                            stack.append(name)
                        else:
                            found.append({'bucket': bucket['id'], 'name': name, 'id': row['id'],
                                'updated_at': row.get('updated_at'), 'metadata': row.get('metadata')})
                        if len(found) + len(stack) + len(seen) > 10000:
                            raise BackupError('backup_object_limit')
                    if len(rows) < 1000:
                        break
                    offset += len(rows)
        return sorted(found, key=lambda x: (x['bucket'], x['name']))


def verify_bytes(encrypted, key, expected_ref):
    if expected_ref != TEST_REF or encrypted[:len(MAGIC)] != MAGIC:
        raise BackupError('backup_identity_or_format_mismatch')
    try:
        plain = AESGCM(key).decrypt(encrypted[8:20], encrypted[20:], MAGIC)
    except Exception:
        raise BackupError('backup_authentication_failed') from None
    with zipfile.ZipFile(io.BytesIO(plain)) as z:
        manifest = json.loads(z.read('manifest.json'))
        if manifest['project_ref'] != expected_ref:
            raise BackupError('backup_identity_mismatch')
        names = ['manifest.json'] + [o['archive_path'] for o in manifest['objects']]
        if len(names) != len(set(names)) or sorted(z.namelist()) != sorted(names):
            raise BackupError('backup_entries_mismatch')
        total = 0
        for obj in manifest['objects']:
            data = z.read(obj['archive_path']); total += len(data)
            if len(data) != obj['size'] or hashlib.sha256(data).hexdigest() != obj['sha256']:
                raise BackupError('backup_checksum_mismatch')
        return {'objects': len(manifest['objects']), 'bytes': total, 'authenticated_encryption': True,
            'scope': 'Storage bytes/buckets, public Auth settings, observed configuration; not a DB/Auth credentials dump'}


def atomic_private_write(output, encrypted):
    # Publish only a complete, fsynced file; link() refuses an existing name.
    with tempfile.NamedTemporaryFile(dir=output.parent, prefix='.nona-encrypted-') as staged:
        staged.write(encrypted); staged.flush(); os.fsync(staged.fileno())
        os.link(staged.name, output)
        directory = os.open(output.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)


def backup(target, output, key, configuration, max_bytes):
    output = Path(output).resolve()
    if output.is_relative_to(REPO) or output.exists() or not output.parent.is_dir() or output.parent.stat().st_mode & 0o077:
        raise BackupError('new_private_output_outside_repository_required')
    safe_configuration(configuration)
    if configuration.get('project_ref') != TEST_REF or configuration.get('environment') != 'test':
        raise BackupError('configuration_identity_mismatch')
    started = time.monotonic()
    buckets = target.json('/storage/v1/bucket')
    before = target.inventory(buckets)
    settings = target.json('/auth/v1/settings')
    if settings.get('disable_signup') is not True:
        raise BackupError('isolated_test_signup_safety_required')
    with tempfile.TemporaryFile() as archive:
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
            objects = []; total = 0
            for i, obj in enumerate(before):
                remaining = max_bytes - total
                path = '/storage/v1/object/authenticated/' + urllib.parse.quote(obj['bucket'], safe='') + '/' + urllib.parse.quote(obj['name'], safe='/')
                data = target.request(path, limit=remaining)
                if len(data) != (obj.get('metadata') or {}).get('size', len(data)):
                    raise BackupError('storage_metadata_size_mismatch')
                total += len(data)
                entry = f'objects/{i:06d}.bin'
                z.writestr(entry, data)
                objects.append({**obj, 'archive_path': entry, 'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
            if before != target.inventory(buckets) or buckets != target.json('/storage/v1/bucket') or settings != target.json('/auth/v1/settings'):
                raise BackupError('target_changed_during_backup')
            manifest = {'format': 1, 'project_ref': TEST_REF, 'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                'buckets': buckets, 'objects': objects, 'auth_public_settings': settings, 'observed_configuration': configuration,
                'limitations': ['No database rows/Auth passwords/API keys/provider secrets exported', 'Dashboard configuration input is operator observed, not a live Management API export']}
            z.writestr('manifest.json', json.dumps(manifest, ensure_ascii=False))
        archive.seek(0); plain = archive.read()
    nonce = os.urandom(12)
    encrypted = MAGIC + nonce + AESGCM(key).encrypt(nonce, plain, MAGIC)
    proof = verify_bytes(encrypted, key, TEST_REF)
    atomic_private_write(output, encrypted)
    proof['duration_seconds'] = round(time.monotonic() - started, 2)
    proof['encrypted_sha256'] = hashlib.sha256(encrypted).hexdigest()
    return proof


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('operation', choices=['backup', 'verify'])
    parser.add_argument('--expected-ref', required=True)
    parser.add_argument('--key-file', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--api-key-file')
    parser.add_argument('--configuration')
    parser.add_argument('--max-bytes', type=int, default=256 * 1024 * 1024)
    args = parser.parse_args()
    try:
        if args.expected_ref != TEST_REF:
            raise BackupError('isolated_test_identity_required')
        key = key_bytes(args.key_file)
        if args.operation == 'verify':
            proof = verify_bytes(private_file(args.output), key, args.expected_ref)
        else:
            if not args.api_key_file or not args.configuration or args.max_bytes <= 0:
                raise BackupError('backup_configuration_required')
            target = Target(args.expected_ref, private_file(args.api_key_file).decode().strip())
            proof = backup(target, args.output, key, json.loads(Path(args.configuration).read_text()), args.max_bytes)
        print(json.dumps({'status': 'PASS', **proof}))
    except Exception as e:
        code = str(e) if isinstance(e, BackupError) else 'backup_internal_failure'
        print(json.dumps({'status': 'FAIL', 'code': code}))
        raise SystemExit(1) from None


if __name__ == '__main__':
    main()
