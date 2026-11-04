"""Read fixed TEST alert counts, using existing GitHub failures as a watermark.
No private payloads, credentials or provider responses are printed.
"""
import argparse
import datetime as dt
import importlib.util
import json
import os
from pathlib import Path
import urllib.request

spec = importlib.util.spec_from_file_location('health', Path(__file__).with_name('health-check.py'))
health = importlib.util.module_from_spec(spec)
spec.loader.exec_module(health)


def json_request(request, limit):
    with urllib.request.build_opener(health.NoRedirect()).open(request, timeout=8) as response:
        if response.status != 200:
            raise ValueError('unexpected_status')
        raw = response.read(limit + 1)
    if len(raw) > limit:
        raise ValueError('response_too_large')
    return json.loads(raw)


def failure_watermark(runs, since, now):
    for run in runs:
        if run['status'] == 'completed' and run['conclusion'] == 'failure':
            # The notification covers this completed job. Using created_at
            # would repeat an event submitted during the job on the next cycle.
            stamp = dt.datetime.fromisoformat(run['updated_at'].replace('Z', '+00:00'))
            if since < stamp <= now:
                since = stamp
    return since


def check(key, github_token, origin=health.ORIGIN, environment='isolated-test'):
    if (origin, environment) not in [(health.ORIGIN, 'isolated-test'),
            ('https://jzbjpaucgckggumhowns.supabase.co', 'commercial-authorized')]:
        raise ValueError('approved_alert_target_required')
    now = dt.datetime.now(dt.timezone.utc)
    since = now - dt.timedelta(days=7)
    if not github_token:
        raise ValueError('github_read_token_required')
    # No extra credential or write permission: current job token reads this repo.
    workflows = ['health.yml', 'alerts.yml'] if environment == 'isolated-test' else ['commercial.yml']
    for workflow in workflows:
        request = urllib.request.Request(
            'https://api.github.com/repos/tpenalba06/NONA-OPS/actions/workflows/' + workflow + '/runs?per_page=20&status=failure',
            headers={'Authorization': 'Bearer ' + github_token, 'Accept': 'application/vnd.github+json'})
        value = json_request(request, 1048576)
        since = failure_watermark(value['workflow_runs'], since, now)
    request = urllib.request.Request(origin + '/rest/v1/rpc/nona_read_operational_alerts',
        data=json.dumps({'_since': since.isoformat()}).encode(), method='POST',
        headers={'apikey': key, 'Content-Type': 'application/json'})
    value = json_request(request, 4096)
    if value.get('schema') != 'nona.alert-inbox.v1' or value.get('environment') != environment or type(value.get('count')) is not int or not 0 <= value['count'] <= 20000:
        raise ValueError('invalid_alert_summary')
    return {'schema': 'nona.alert-inbox.v1', 'environment': environment,
            'status': 'ALERT' if value['count'] else 'PASS', 'count': value['count'],
            'event': 'server_request_failed' if value['count'] else None}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--api-key-file', required=True)
    args = parser.parse_args()
    try:
        result = check(health.private_key(args.api_key_file), os.environ.get('GITHUB_TOKEN', ''))
    except Exception:
        result = {'schema': 'nona.alert-inbox.v1', 'environment': 'isolated-test', 'status': 'FAIL', 'code': 'alert_inbox_unverifiable'}
    print(json.dumps(result))
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a') as f:
            f.write('\n## TEST server alerts\n\n' + result['status'] + ': ' + str(result.get('count', 0)) +
                    ' fixed server error events. On alert inspect server logs and the last approved release; no automatic rollback or financial action.\n')
    if result['status'] != 'PASS':
        print('::error title=Nona TEST server alert::Review fixed operational event summary and hosting logs. No exception or guest content was exported.')
        raise SystemExit(1)
