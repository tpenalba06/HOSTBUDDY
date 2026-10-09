"""Forward only an allowlisted operational event; no request or exception data.

No destination is configured by default. Local TEST receiver requires an
explicit flag; a real destination must be authorized before configuration.
"""
import argparse
import datetime
import ipaddress
import json
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request

EVENTS = {'import_source_unavailable', 'server_request_failed', 'guide_media_signing_failed',
    'guide_snapshot_failed', 'server_unhandled_error', 'server_unhandled_rejection',
    'stripe_webhook_unavailable', 'stripe_webhook_failed', 'stripe_webhook_mode_mismatch',
    'billing_sync_failed', 'billing_sync_pending'}


def safe_event(raw):
    if not isinstance(raw, dict) or raw.get('schema') != 'hostbuddy.operations.v1' or raw.get('event') not in EVENTS or raw.get('level') != 'error':
        raise ValueError('invalid_event')
    stamp = raw.get('at', '')
    if not isinstance(stamp, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z', stamp):
        raise ValueError('invalid_timestamp')
    datetime.datetime.fromisoformat(stamp.replace('Z', '+00:00'))
    event = {k: raw[k] for k in ('schema', 'event', 'level', 'at')}
    if type(raw.get('pending')) is int and 0 <= raw['pending'] <= 9007199254740991:
        event['pending'] = raw['pending']
    return event


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('receiver_redirect_refused')


def forward(event, destination, token, allow_local_test=False):
    url = urllib.parse.urlsplit(destination)
    if url.username or url.password or not url.hostname or url.fragment:
        raise ValueError('invalid_receiver')
    local = False
    try:
        local = ipaddress.ip_address(url.hostname).is_loopback
    except ValueError:
        pass
    if not (url.scheme == 'https' or (allow_local_test and local and url.scheme == 'http')):
        raise ValueError('https_receiver_required')
    if not token or '\n' in token or '\r' in token:
        raise ValueError('receiver_token_required')
    payload = json.dumps(safe_event(event)).encode()
    request = urllib.request.Request(destination, data=payload, method='POST',
        headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token})
    opener = urllib.request.build_opener(NoRedirect())
    with opener.open(request, timeout=5) as response:
        if response.status not in (200, 201, 202, 204):
            raise ValueError('receiver_did_not_acknowledge')
        return response.status


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--receiver-configuration', required=True)
    parser.add_argument('--allow-local-test', action='store_true')
    args = parser.parse_args()
    try:
        p = Path(args.receiver_configuration)
        if p.stat().st_mode & 0o077:
            raise ValueError('private_receiver_configuration_required')
        config = json.loads(p.read_text())
        raw = sys.stdin.buffer.read(8193)
        if len(raw) > 8192:
            raise ValueError('event_too_large')
        code = forward(json.loads(raw), config['url'], config['token'], args.allow_local_test)
        print(json.dumps({'status': 'ACKNOWLEDGED', 'http': code}))
    except Exception:
        # A failure is actionable, but the URL/token/provider response is private.
        print(json.dumps({'status': 'FAIL', 'code': 'alert_delivery_failed'}))
        raise SystemExit(1) from None


if __name__ == '__main__':
    main()
