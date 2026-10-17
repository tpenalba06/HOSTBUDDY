"""Read-only logical PostgreSQL/Auth backup. TEST only; no restore command.

Requires existing PostgreSQL credentials, not a Supabase HTTP API key.
Storage object bytes, global roles/passwords and provider configuration are
separate recovery inputs. Nothing is scheduled by this module.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import resource
import shutil
import stat
import subprocess
import tempfile
import zipfile
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography import x509

TEST_REF = 'mhhtnqfdkyudwyqlmnce'
MAGIC = b'NONAPG01'
LIMIT = 256 * 1024 * 1024
REPO = Path(__file__).resolve().parents[2]
REQUIRED = {('auth', 'users'), ('auth', 'identities'), ('public', 'properties'),
            ('storage', 'objects'), ('storage', 'buckets')}


class BackupError(Exception):
    pass


def private_read(path, limit):
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
        with os.fdopen(fd, 'rb') as f:
            info = os.fstat(f.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_mode & 0o077:
                raise BackupError('private_input_required')
            raw = f.read(limit + 1)
            if len(raw) > limit:
                raise BackupError('input_size_limit')
            return raw
    except OSError:
        raise BackupError('private_input_required') from None


def read_key(path):
    raw = private_read(path, 128)
    if len(raw) == 32:
        return raw
    try:
        key = bytes.fromhex(raw.decode().strip())
        if len(key) == 32:
            return key
    except (ValueError, UnicodeError):
        pass
    raise BackupError('invalid_encryption_key')


def connection(value, expected_ref):
    if expected_ref != TEST_REF or value.get('project_ref') != TEST_REF:
        raise BackupError('isolated_test_identity_required')
    if set(value) != {'project_ref', 'host', 'port', 'database', 'user', 'password'}:
        raise BackupError('connection_fields_invalid')
    host, user = value['host'], value['user']
    direct = host == f'db.{TEST_REF}.supabase.co' and user in {'postgres', 'backup_reader'}
    pooler = (isinstance(host, str) and
              re.fullmatch(r'aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com', host) and
              user in {f'postgres.{TEST_REF}', f'backup_reader.{TEST_REF}'})
    if not (direct or pooler) or type(value['port']) is not int or value['port'] != 5432:
        raise BackupError('isolated_database_endpoint_required')
    if value['database'] != 'postgres':
        raise BackupError('isolated_database_endpoint_required')
    password = value['password']
    if not isinstance(password, str) or not password or len(password) > 512 or '\n' in password or '\r' in password or '\x00' in password:
        raise BackupError('database_password_required')
    return value


def clients():
    found = {}
    for name in ['pg_dump', 'pg_restore']:
        binary = shutil.which(name, path='/usr/lib/postgresql/18/bin:/usr/lib/postgresql/17/bin:/usr/bin:/bin')
        if not binary:
            raise BackupError('postgres_clients_required')
        r = subprocess.run([binary, '--version'], capture_output=True, timeout=10,
                           env={'PATH': '/usr/bin:/bin', 'LANG': 'C.UTF-8'})
        match = re.search(rb'\(PostgreSQL\) (\d+)\.', r.stdout)
        if r.returncode or not match or int(match[1]) < 17:
            raise BackupError('postgres_clients_version_required')
        found[name] = binary
    return found


def validate_ca(raw):
    if raw is None:
        return
    try:
        certificates = x509.load_pem_x509_certificates(raw)
        if not certificates or len(raw) > 20480 or not all(
                c.extensions.get_extension_for_class(x509.BasicConstraints).value.ca
                for c in certificates):
            raise ValueError()
    except Exception:
        raise BackupError('approved_database_ca_required') from None


def pg_environment(value, directory, ca=None):
    validate_ca(ca)
    def escape(v):
        return str(v).replace('\\', '\\\\').replace(':', '\\:')
    passfile = directory / 'pgpass'
    fd = os.open(passfile, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, 'w') as f:
        f.write(':'.join(escape(value[k]) for k in ['host', 'port', 'database', 'user', 'password']) + '\n')
    rootcert = 'system'
    if ca is not None:
        certfile = directory / 'database-ca.crt'
        fd = os.open(certfile, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(fd, 'wb') as f:
            f.write(ca)
        rootcert = str(certfile)
    # No inherited PG*, TLS overrides, credentials or service files.
    return {'PATH': '/usr/bin:/bin', 'LANG': 'C.UTF-8', 'HOME': str(directory),
            'PGHOST': value['host'], 'PGPORT': '5432', 'PGDATABASE': 'postgres',
            'PGUSER': value['user'], 'PGPASSFILE': str(passfile),
            'PGCONNECT_TIMEOUT': '15', 'PGSSLMODE': 'verify-full',
            'PGSSLROOTCERT': rootcert, 'PGAPPNAME': 'nona-isolated-backup',
            'PGOPTIONS': '-c default_transaction_read_only=on -c statement_timeout=300000'}


def inspect_dump(path, binary):
    with open(path, 'rb') as f:
        if f.read(5) != b'PGDMP':
            raise BackupError('invalid_dump_format')
    r = subprocess.run([binary, '--list', str(path)], capture_output=True, timeout=60,
                       env={'PATH': '/usr/bin:/bin', 'LANG': 'C.UTF-8'})
    if r.returncode:
        raise BackupError('dump_inventory_invalid')
    rows = set(re.findall(rb'\bTABLE DATA ([a-z_]+) ([a-z_]+)\b', r.stdout))
    if not {(s.encode(), t.encode()) for s, t in REQUIRED}.issubset(rows):
        raise BackupError('required_database_auth_data_missing')
    return len(rows)


def seal(dump, key, table_count):
    manifest = {'format': 1, 'project_ref': TEST_REF, 'bytes': len(dump),
                'sha256': hashlib.sha256(dump).hexdigest(), 'data_tables': table_count,
                'scope': 'logical single database including Auth; not global roles, Storage bytes or provider configuration'}
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_STORED) as archive:
        archive.writestr('manifest.json', json.dumps(manifest))
        archive.writestr('database.dump', dump)
    nonce = os.urandom(12)
    return MAGIC + nonce + AESGCM(key).encrypt(nonce, buffer.getvalue(), MAGIC)


def unseal(encrypted, key, expected_ref):
    if expected_ref != TEST_REF or len(encrypted) > LIMIT + 8192 or encrypted[:8] != MAGIC:
        raise BackupError('backup_identity_or_size_invalid')
    try:
        plain = AESGCM(key).decrypt(encrypted[8:20], encrypted[20:], MAGIC)
        with zipfile.ZipFile(io.BytesIO(plain)) as archive:
            if sorted(archive.namelist()) != ['database.dump', 'manifest.json']:
                raise ValueError()
            for info in archive.infolist():
                bound = 4096 if info.filename == 'manifest.json' else LIMIT
                if info.compress_type != zipfile.ZIP_STORED or info.file_size > bound:
                    raise ValueError()
            manifest = json.loads(archive.read('manifest.json'))
            dump = archive.read('database.dump')
        if (manifest['format'] != 1 or manifest['project_ref'] != TEST_REF or
                manifest['bytes'] != len(dump) or len(dump) > LIMIT or
                not dump.startswith(b'PGDMP') or manifest['sha256'] != hashlib.sha256(dump).hexdigest()):
            raise ValueError()
    except Exception:
        raise BackupError('backup_authentication_or_content_invalid') from None
    return dump, manifest


def verify(path, key, expected_ref, binaries):
    dump, manifest = unseal(private_read(path, LIMIT + 8192), key, expected_ref)
    with tempfile.TemporaryDirectory(prefix='nona-db-verify-') as temp:
        private = Path(temp) / 'database.dump'
        private.write_bytes(dump)
        private.chmod(0o600)
        count = inspect_dump(private, binaries['pg_restore'])
    if count != manifest['data_tables']:
        raise BackupError('dump_inventory_mismatch')
    return {'status': 'PASS', 'authenticated_encryption': True, 'required_auth_data': True,
            'bytes': len(dump), 'data_tables': count, 'restoration_proven': False}


def backup(config, key, expected_ref, output, max_bytes, binaries, ca=None):
    value = connection(config, expected_ref)
    validate_ca(ca)
    if type(max_bytes) is not int or not 1 <= max_bytes <= LIMIT:
        raise BackupError('backup_limit_invalid')
    output = Path(output).absolute()
    parent = output.parent.resolve()
    in_git = any((ancestor / '.git').exists() for ancestor in [parent, *parent.parents])
    if in_git or parent.is_relative_to(REPO) or parent.stat().st_mode & 0o077 or output.exists() or output.is_symlink():
        raise BackupError('private_new_output_required')
    with tempfile.TemporaryDirectory(prefix='nona-db-export-') as temp:
        directory = Path(temp)
        env = pg_environment(value, directory, ca)
        dumpfile = directory / 'database.dump'
        def bound_file():
            resource.setrlimit(resource.RLIMIT_FSIZE, (max_bytes, max_bytes))
        try:
            r = subprocess.run([binaries['pg_dump'], '--format=custom', '--no-password',
                                '--lock-wait-timeout=30000', '--file', str(dumpfile)],
                               env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                               timeout=600, preexec_fn=bound_file)
        except (OSError, subprocess.TimeoutExpired):
            raise BackupError('database_export_failed') from None
        if r.returncode or not dumpfile.is_file() or dumpfile.stat().st_size > max_bytes:
            raise BackupError('database_export_failed')
        dumpfile.chmod(0o600)
        count = inspect_dump(dumpfile, binaries['pg_restore'])
        encrypted = seal(dumpfile.read_bytes(), key, count)
        unseal(encrypted, key, expected_ref)
        with tempfile.NamedTemporaryFile(dir=parent, prefix='.nona-db-encrypted-') as stage:
            stage.write(encrypted)
            stage.flush()
            os.fsync(stage.fileno())
            os.link(stage.name, output)  # Never replace a previous backup.
    return verify(output, key, expected_ref, binaries)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['backup', 'verify'])
    parser.add_argument('--expected-ref', required=True)
    parser.add_argument('--key-file', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--connection-file')
    parser.add_argument('--ca-file')
    parser.add_argument('--max-bytes', type=int, default=64 * 1024 * 1024)
    args = parser.parse_args()
    try:
        if args.expected_ref != TEST_REF:
            raise BackupError('isolated_test_identity_required')
        key = read_key(args.key_file)
        if args.action == 'backup':
            config = json.loads(private_read(args.connection_file, 4096))
            connection(config, args.expected_ref)  # Reject target before any client invocation.
            ca = private_read(args.ca_file, 20480) if args.ca_file else None
            validate_ca(ca)
            result = backup(config, key, args.expected_ref, args.output, args.max_bytes, clients(), ca)
        else:
            result = verify(args.output, key, args.expected_ref, clients())
        print(json.dumps({'schema': 'nona.database-backup.v1', 'environment': 'isolated-test', **result}))
        return 0
    except Exception as error:
        code = str(error) if isinstance(error, BackupError) else 'database_backup_failed'
        print(json.dumps({'schema': 'nona.database-backup.v1', 'environment': 'isolated-test', 'status': 'FAIL', 'code': code}))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
