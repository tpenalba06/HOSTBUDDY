"""Only new commercial authorization guards; no export/restore or acquired tests."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('commercial', Path(__file__).with_name('commercial-database-backup.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ApprovalTests(unittest.TestCase):
    def test_requires_exact_human_approval_target_and_scope(self):
        value = {'schema': 'nona.commercial-backup-approval.v1', 'authorized': True,
            'project_ref': 'jzbjpaucgckggumhowns', 'origin': 'https://host-buddy-concierge.lovable.app',
            'destination_repository': 'tpenalba06/NONA-OPS', 'scope': 'read-only-database-auth-and-guide-media-export'}
        self.assertEqual(module.approval(value), 'jzbjpaucgckggumhowns')
        for key, bad in [('authorized', False), ('project_ref', 'mhhtnqfdkyudwyqlmnce'),
                         ('destination_repository', 'tpenalba06/HOSTBUDDY'), ('scope', 'restore'),
                         ('origin', 'https://id-preview--example.lovable.app')]:
            with self.assertRaisesRegex(ValueError, 'commercial_backup_not_authorized'):
                module.approval({**value, key: bad})
        for bad in [None, {}, {**value, 'password': 'not-permitted'}]:
            with self.assertRaisesRegex(ValueError, 'commercial_backup_not_authorized'):
                module.approval(bad)


if __name__ == '__main__':
    unittest.main()
