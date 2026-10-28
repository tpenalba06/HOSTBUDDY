import importlib.util
from pathlib import Path
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
import unittest

s = importlib.util.spec_from_file_location('monitor', Path(__file__).with_name('http-monitor.py'))
m = importlib.util.module_from_spec(s)
s.loader.exec_module(m)
REVISION = 'a' * 40


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass

    def do_GET(self):
        if self.path == '/ready':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(f'<meta name="nona-build-revision" content="{REVISION}"><meta content="clean" name="nona-build-state">'.encode())
        elif self.path == '/signin':
            self.send_response(200); self.send_header('Content-Type', 'text/html'); self.end_headers()
            self.wfile.write(b'Private login token=secret-do-not-print')
        else:
            self.send_response(int(self.path.strip('/')))
            self.send_header('Location', 'https://unapproved.invalid/private')
            self.end_headers()
            self.wfile.write(b'Private upstream error secret-do-not-print')


class Checks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = HTTPServer(('127.0.0.1', 0), Handler)
        cls.origin = f'http://127.0.0.1:{cls.server.server_port}'
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def read(self, path, revision=REVISION):
        return m.probe(self.origin + path, self.origin, revision, True)

    def test_real_http_build(self):
        self.assertEqual(self.read('/ready')['state'], 'READY')
        self.assertEqual(self.read('/ready', 'b' * 40)['state'], 'STALE_BUILD')

    def test_failure_classification_and_privacy(self):
        for code, state in [(503, 'DOWN'), (403, 'RESTRICTED'), (401, 'RESTRICTED'), (429, 'RATE_LIMITED'), (404, 'ROUTE_UNAVAILABLE'), (302, 'REDIRECT_REVIEW')]:
            with self.subTest(code=code):
                value = self.read('/' + str(code))
                self.assertEqual(value['state'], state)
                self.assertEqual(set(value), {'schema', 'at', 'state', 'http', 'ms'})
                self.assertNotIn('secret', str(value))

    def test_login_page_never_counts_as_app(self):
        self.assertEqual(self.read('/signin')['state'], 'BUILD_UNVERIFIED')

    def test_configuration_refused_before_request(self):
        for url in [self.origin+'/ready?token=secret', self.origin+'/ready#private', 'http://localhost/ready']:
            self.assertIsNone(m.probe(url, self.origin, REVISION, True)['http'])
        self.assertIsNone(m.probe(self.origin+'/ready', self.origin, 'unknown', True)['http'])


if __name__ == '__main__': unittest.main()
