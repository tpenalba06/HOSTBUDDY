import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('health', Path(__file__).with_name('health-check.py'))
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)


class Fixture:
    def read(self, name):
        return {'auth_health': {'name': 'GoTrue', 'private': 'CANARY'},
                'auth_safety': {'disable_signup': True, 'mail': 'CANARY'},
                'private_storage': [{'id': 'guide-media', 'public': False, 'owner': 'CANARY'}],
                'database_read': None}[name]


class HealthTests(unittest.TestCase):
    def test_success_and_failure_are_minimized(self):
        self.assertEqual(h.probe(Fixture())['status'], 'PASS')
        class Unavailable(Fixture):
            def read(self, name):
                raise RuntimeError('CANARY email/token/stack')
        result = h.probe(Unavailable())
        self.assertEqual(result['status'], 'FAIL')
        self.assertNotIn('CANARY', json.dumps([h.probe(Fixture()), result]))
        self.assertEqual(len(result['checks']), 4)

    def test_unsafe_configuration_not_treated_as_health(self):
        self.assertFalse(h.valid('auth_safety', {'disable_signup': False}))
        self.assertFalse(h.valid('private_storage', [{'id': 'guide-media', 'public': True}]))
        self.assertFalse(h.valid('database_read', {'private': 'CANARY'}))
        self.assertFalse(h.valid('auth_health', '<html>sign in</html>'))

    def test_source_secret_symlink_and_redirect_refused(self):
        with self.assertRaises(ValueError): h.Target('jzbjpaucgckggumhowns', 'sb_secret_TEST')
        with self.assertRaises(ValueError): h.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://other.test')
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'key'; p.write_text('sb_secret_TEST'); p.chmod(0o644)
            with self.assertRaises(ValueError): h.private_key(p)
            p.chmod(0o600)
            link = Path(d) / 'link'; link.symlink_to(p)
            with self.assertRaises(ValueError): h.private_key(link)

    def test_requests_only_fixed_get_endpoints_without_redirect(self):
        target = h.Target(h.TEST_REF, 'sb_secret_TEST')
        class Response:
            status = 200
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, limit): return b'{"name":"GoTrue"}'
        with patch.object(target.opener, 'open', return_value=Response()) as request:
            target.read('auth_health')
            req = request.call_args.args[0]
            self.assertEqual(req.get_method(), 'GET')
            self.assertEqual(req.full_url, h.ORIGIN + h.PATHS['auth_health'])
            self.assertEqual(request.call_args.kwargs['timeout'], 8)
        with self.assertRaises(KeyError): target.read('private-url')


if __name__ == '__main__': unittest.main()
