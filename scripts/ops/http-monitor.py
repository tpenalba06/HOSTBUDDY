"""Read-only HTTP availability/build probe; no headers, URLs or bodies in output."""
import argparse
import datetime
from html.parser import HTMLParser
import ipaddress
import json
import time
import urllib.error
import urllib.parse
import urllib.request


class Meta(HTMLParser):
    def __init__(self):
        super().__init__()
        self.revision = None
        self.state = None

    def handle_starttag(self, tag, attrs):
        if tag == 'meta':
            a = dict(attrs)
            if a.get('name') == 'nona-build-revision':
                self.revision = a.get('content')
            if a.get('name') == 'nona-build-state':
                self.state = a.get('content')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


def probe(url, allowed_origin, revision, allow_local=False):
    started = time.monotonic()
    result = {'schema': 'nona.http.v1', 'at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'state': 'UNVERIFIABLE', 'http': None}
    try:
        u = urllib.parse.urlsplit(url)
        origin = urllib.parse.urlsplit(allowed_origin)
        local = allow_local and u.scheme == 'http' and ipaddress.ip_address(u.hostname).is_loopback if u.scheme == 'http' else False
        if (not u.hostname or u.username or u.password or u.query or u.fragment or
                (u.scheme != 'https' and not local) or
                (u.scheme, u.hostname, u.port) != (origin.scheme, origin.hostname, origin.port) or
                origin.username or origin.password or origin.query or origin.fragment or origin.path not in ('', '/')):
            raise ValueError('configuration')
        import re
        if not re.fullmatch(r'[a-f0-9]{40}', revision):
            raise ValueError('configuration')
        opener = urllib.request.build_opener(NoRedirect())
        request = urllib.request.Request(url, method='GET', headers={'Accept': 'text/html'})
        try:
            with opener.open(request, timeout=8) as response:
                result['http'] = response.status
                raw = response.read(1024 * 1024 + 1)
                content_type = response.headers.get_content_type()
        except urllib.error.HTTPError as error:
            result['http'] = error.code
            result['state'] = ('RESTRICTED' if error.code in (401, 403) else
                               'RATE_LIMITED' if error.code == 429 else
                               'REDIRECT_REVIEW' if 300 <= error.code < 400 else
                               'DOWN' if error.code >= 500 else 'ROUTE_UNAVAILABLE')
            error.close()
            return result
        if len(raw) > 1024 * 1024 or content_type != 'text/html':
            return result
        parser = Meta()
        parser.feed(raw.decode('utf-8', errors='replace'))
        result['state'] = ('READY' if parser.revision == revision and parser.state == 'clean' else
                           'STALE_BUILD' if parser.revision and parser.revision != 'unknown' else 'BUILD_UNVERIFIED')
    except Exception:
        pass
    finally:
        result['ms'] = round((time.monotonic() - started) * 1000)
    return result


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--url', required=True)
    p.add_argument('--allowed-origin', required=True)
    p.add_argument('--revision', required=True)
    p.add_argument('--allow-local-test', action='store_true')
    a = p.parse_args()
    value = probe(a.url, a.allowed_origin, a.revision, a.allow_local_test)
    print(json.dumps(value))
    raise SystemExit(0 if value['state'] == 'READY' else 1)
