"""Synthetic safety/integrity checks. No database connection or restoration."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('database_backup', Path(__file__).with_name('database-backup.py'))
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)
CANARY = 'PRIVATE_PASSWORD_CANARY:with\\escape'
KEY = bytes(range(32))
DUMP = b'PGDMP-synthetic-auth-password-hash-and-application-rows'
TOC = b'\n'.join(f'1; 0 1 TABLE DATA {schema} {table} postgres'.encode() for schema, table in b.REQUIRED)
BINARIES = {'pg_dump': 'pg_dump', 'pg_restore': 'pg_restore'}


class SafetyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.config = {'project_ref': b.TEST_REF, 'host': f'db.{b.TEST_REF}.supabase.co',
                       'port': 5432, 'database': 'postgres', 'user': 'postgres', 'password': CANARY}

    def tearDown(self):
        self.temp.cleanup()

    def fake_pg(self, command, **kwargs):
        if command[0] == 'pg_dump':
            self.assertEqual(kwargs['stderr'], subprocess.DEVNULL)
            self.assertEqual(kwargs['stdout'], subprocess.DEVNULL)
            self.assertNotIn(CANARY, str(command) + str(kwargs['env']))
            self.assertEqual(kwargs['env']['PGSSLMODE'], 'verify-full')
            self.assertIn('default_transaction_read_only=on', kwargs['env']['PGOPTIONS'])
            self.passfile = Path(kwargs['env']['PGPASSFILE'])
            self.assertEqual(self.passfile.stat().st_mode & 0o777, 0o600)
            Path(command[command.index('--file') + 1]).write_bytes(DUMP)
        return SimpleNamespace(returncode=0, stdout=TOC, stderr=b'')

    def test_target_and_connection_reject_before_export(self):
        changes = [{'project_ref': 'other'}, {'host': 'db.jzbjpaucgckggumhowns.supabase.co'},
                   {'host': 'attacker.example'}, {'port': 6543}, {'database': 'other'},
                   {'host': 'aws-0-eu-west-1.pooler.supabase.com', 'user': 'postgres.other'},
                   {'sslmode': 'disable'}, {'password': 'bad\npassword'}]
        with patch.object(b.subprocess, 'run') as run:
            for change in changes:
                with self.subTest(change=list(change)), self.assertRaises(b.BackupError):
                    b.backup({**self.config, **change}, KEY, b.TEST_REF, self.root / 'out', 1024, BINARIES)
            run.assert_not_called()

    def test_private_inputs_refuse_symlink_permissions_and_oversize(self):
        original = self.root / 'input'
        original.write_text(CANARY)
        original.chmod(0o600)
        link = self.root / 'link'
        link.symlink_to(original)
        with self.assertRaises(b.BackupError):
            b.private_read(link, 1024)
        original.chmod(0o644)
        with self.assertRaises(b.BackupError):
            b.private_read(original, 1024)
        original.chmod(0o600)
        with self.assertRaises(b.BackupError):
            b.private_read(original, 2)

    def test_environment_has_no_inherited_pg_or_tls_overrides(self):
        with patch.dict(os.environ, {'PGHOST': 'source', 'PGSERVICE': 'evil', 'PGPASSWORD': CANARY,
                                    'SSL_CERT_FILE': 'evil', 'STRIPE_SECRET_KEY': CANARY}):
            env = b.pg_environment(self.config, self.root)
        self.assertEqual(env['PGHOST'], self.config['host'])
        for name in ['PGSERVICE', 'PGPASSWORD', 'SSL_CERT_FILE', 'STRIPE_SECRET_KEY']:
            self.assertNotIn(name, env)
        self.assertEqual(env['PGSSLROOTCERT'], 'system')
        self.assertNotIn(CANARY, json.dumps(env))

    def test_encrypted_roundtrip_wrong_key_tamper_and_no_overwrite(self):
        output = self.root / 'result.nonaenc'
        with patch.object(b.subprocess, 'run', side_effect=self.fake_pg):
            result = b.backup(self.config, KEY, b.TEST_REF, output, 1024, BINARIES)
            self.assertEqual(result['status'], 'PASS')
            self.assertFalse(result['restoration_proven'])
            self.assertFalse(self.passfile.exists())
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
            self.assertNotIn(DUMP, output.read_bytes())
            self.assertEqual(b.verify(output, KEY, b.TEST_REF, BINARIES)['data_tables'], len(b.REQUIRED))
            original = output.read_bytes()
            with self.assertRaises(b.BackupError):
                b.backup(self.config, KEY, b.TEST_REF, output, 1024, BINARIES)
            self.assertEqual(output.read_bytes(), original)
        for encrypted, key in [(original, bytes(32)), (original[:-1] + bytes([original[-1] ^ 1]), KEY)]:
            with self.assertRaises(b.BackupError):
                b.unseal(encrypted, key, b.TEST_REF)

    def test_partial_auth_or_oversize_cannot_publish(self):
        def incomplete(command, **kwargs):
            result = self.fake_pg(command, **kwargs)
            result.stdout = TOC.replace(b'TABLE DATA auth identities', b'TABLE DATA auth excluded')
            return result
        output = self.root / 'partial'
        with patch.object(b.subprocess, 'run', side_effect=incomplete), self.assertRaises(b.BackupError):
            b.backup(self.config, KEY, b.TEST_REF, output, 1024, BINARIES)
        self.assertFalse(output.exists())
        with patch.object(b.subprocess, 'run', side_effect=self.fake_pg), self.assertRaises(b.BackupError):
            b.backup(self.config, KEY, b.TEST_REF, output, 4, BINARIES)
        self.assertFalse(output.exists())

    def test_client_error_does_not_publish_or_expose_stderr(self):
        with patch.object(b.subprocess, 'run', return_value=SimpleNamespace(returncode=1, stdout=CANARY.encode(), stderr=CANARY.encode())):
            with self.assertRaisesRegex(b.BackupError, '^database_export_failed$'):
                b.backup(self.config, KEY, b.TEST_REF, self.root / 'failed', 1024, BINARIES)
        self.assertFalse((self.root / 'failed').exists())

    def test_cli_wrong_target_never_reads_credentials_or_starts_client(self):
        out = io.StringIO()
        with patch('sys.argv', ['database-backup.py', 'backup', '--expected-ref', 'other',
                               '--key-file', CANARY, '--output', CANARY]), contextlib.redirect_stdout(out), \
                patch.object(b, 'private_read') as read, patch.object(b, 'clients') as clients:
            self.assertEqual(b.main(), 1)
            read.assert_not_called()
            clients.assert_not_called()
        self.assertNotIn(CANARY, out.getvalue())
        self.assertEqual(json.loads(out.getvalue())['code'], 'isolated_test_identity_required')


if __name__ == '__main__':
    unittest.main()
