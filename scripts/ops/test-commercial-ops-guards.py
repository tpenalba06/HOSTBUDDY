"""New preparation guards only: no remote target, backup, restore or real payment."""
import importlib.util
from pathlib import Path
import tempfile
import unittest


def load(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class GuardTests(unittest.TestCase):
    def test_commercial_receiver_approval_cannot_be_test_or_implicit(self):
        module = load('commercial-alerts')
        value = {'schema':'nona.commercial-alert-approval.v1','authorized':True,
            'project_ref':'jzbjpaucgckggumhowns','destination_repository':'tpenalba06/NONA-OPS',
            'scope':'private-service-role-only-alert-receiver-and-notification'}
        module.approval(value)
        for bad in [None, {}, {**value, 'authorized':False}, {**value, 'project_ref':'mhhtnqfdkyudwyqlmnce'}]:
            with self.assertRaisesRegex(ValueError, 'commercial_alerts_not_authorized'):
                module.approval(bad)

    def test_media_rejects_test_configuration_before_a_remote_read(self):
        module = load('commercial-media-backup')
        class Primitives:
            REPO = Path(__file__).resolve().parents[2]
            def safe_configuration(self, value): pass
        class NeverRead:
            def json(self, path): raise AssertionError('unexpected_remote_read')
        with tempfile.TemporaryDirectory(prefix='nona-commercial-guard-') as directory:
            with self.assertRaisesRegex(ValueError, 'commercial_configuration_required'):
                module.backup(Primitives(), NeverRead(), Path(directory) / 'new.nonaenc', b'',
                    {'project_ref':'mhhtnqfdkyudwyqlmnce','environment':'test'})


if __name__ == '__main__':
    unittest.main()
