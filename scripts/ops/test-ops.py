import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
import zipfile
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def module(name, file):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).parent / file)
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result)
    return result


b = module('backup', 'storage-backup.py'); a = module('alerts', 'forward-alert.py')
KEY = bytes(range(32))


class TargetFixture:
    changed = False
    def json(self, path):
        return [{'id': 'guide-media', 'public': False}] if path == '/storage/v1/bucket' else {'disable_signup': True}
    def inventory(self, buckets):
        self.reads = getattr(self, 'reads', 0) + 1
        return [{'bucket': 'guide-media', 'name': 'private/picture.png', 'id': 'fake-id', 'metadata': {'size': 3}, 'updated_at': str(self.reads) if self.changed else 'fixed'}]
    def request(self, path, limit):
        if limit < 3: raise b.BackupError('backup_size_limit')
        return b'png'


class RecoveryTests(unittest.TestCase):
    def test_authenticated_bundle_and_wrong_key_tamper(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'test.enc'
            proof = b.backup(TargetFixture(), output, KEY, {'project_ref': b.TEST_REF, 'environment': 'test'}, 10)
            self.assertEqual(proof['objects'], 1); self.assertEqual(proof['bytes'], 3)
            encrypted = output.read_bytes()
            for wrong, key in [(encrypted, os.urandom(32)), (encrypted[:-1] + bytes([encrypted[-1] ^ 1]), KEY)]:
                with self.assertRaisesRegex(b.BackupError, 'authentication_failed'): b.verify_bytes(wrong, key, b.TEST_REF)
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
            with self.assertRaises(FileExistsError): b.atomic_private_write(output, b'cannot-overwrite')
            self.assertEqual(output.read_bytes(), encrypted)
    def test_source_and_secret_configuration_rejected(self):
        with self.assertRaisesRegex(b.BackupError, 'identity'): b.Target('jzbjpaucgckggumhowns', 'sb_secret_fixture')
        with self.assertRaisesRegex(b.BackupError, 'secret'): b.safe_configuration({'smtp_password': 'must-not-export'})
    def test_changed_snapshot_and_limits_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'test.enc'; config = {'project_ref': b.TEST_REF, 'environment': 'test'}
            target = TargetFixture(); target.changed = True
            with self.assertRaisesRegex(b.BackupError, 'changed_during'): b.backup(target, output, KEY, config, 10)
            self.assertFalse(output.exists())
            with self.assertRaisesRegex(b.BackupError, 'size_limit'): b.backup(TargetFixture(), output, KEY, config, 2)
    def test_incomplete_archive_rejected(self):
        archive = io.BytesIO()
        with zipfile.ZipFile(archive, 'w') as z:
            z.writestr('manifest.json', json.dumps({'project_ref': b.TEST_REF, 'objects': []}))
            z.writestr('unexpected-private-file', 'unexpected')
        nonce = os.urandom(12); encoded = b.MAGIC + nonce + AESGCM(KEY).encrypt(nonce, archive.getvalue(), b.MAGIC)
        with self.assertRaisesRegex(b.BackupError, 'entries'): b.verify_bytes(encoded, KEY, b.TEST_REF)
    def test_alert_minimizes_payload_and_rejects_unknown(self):
        event = {'schema': 'hostbuddy.operations.v1', 'event': 'server_request_failed', 'level': 'error', 'at': '2026-10-09T18:00:00.000Z', 'body': 'PII', 'token': 'SECRET', 'stack': 'private', 'pending': -1}
        self.assertEqual(set(a.safe_event(event)), {'schema', 'event', 'level', 'at'})
        with self.assertRaises(ValueError): a.safe_event({**event, 'event': 'private-body'})
        with self.assertRaises(ValueError): a.forward(event, 'http://example.com/', 'private-token')


if __name__ == '__main__': unittest.main()
