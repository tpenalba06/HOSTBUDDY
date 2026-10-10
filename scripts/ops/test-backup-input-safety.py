import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('backup', Path(__file__).with_name('storage-backup.py'))
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)


class BackupInputSafety(unittest.TestCase):
    def test_linked_private_input_is_refused(self):
        with tempfile.TemporaryDirectory() as d:
            key = Path(d) / 'key'; key.write_bytes(b'CANARY'); key.chmod(0o600)
            link = Path(d) / 'link'; link.symlink_to(key)
            with self.assertRaises(b.BackupError):
                b.private_file(link)

    def test_private_regular_input_works_and_public_input_is_refused(self):
        with tempfile.TemporaryDirectory() as d:
            key = Path(d) / 'key'; key.write_bytes(b'CANARY'); key.chmod(0o600)
            self.assertEqual(b.private_file(key), b'CANARY')
            key.chmod(0o644)
            with self.assertRaises(b.BackupError):
                b.private_file(key)


if __name__ == '__main__':
    unittest.main()
