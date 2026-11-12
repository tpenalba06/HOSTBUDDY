"""Evaluate minimized GitHub observations collected by an independent runner.

No network, credentials, provider messages, or writes. Never infer service health
from the absence of a run. Input must cover both named workflows completely.
"""
import datetime as dt
import json
import sys

LIMITS = {'health': 3 * 3600, 'backup': 36 * 3600}
BAD = {'failure', 'timed_out', 'action_required', 'startup_failure'}
CONCLUSIONS = BAD | {'success', 'cancelled', 'skipped', 'neutral', 'stale'}


def instant(value):
    if not isinstance(value, str):
        raise ValueError('invalid_time')
    parsed = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('timezone_required')
    return parsed.astimezone(dt.timezone.utc)


def evaluate(observation, now):
    if now.tzinfo is None:
        raise ValueError('timezone_required')
    unknown = {'schema': 'nona.cycles.v1', 'environment': 'isolated-test',
               'status': 'UNVERIFIABLE', 'code': 'monitoring_unverifiable'}
    try:
        if observation.get('repository') != 'tpenalba06/NONA-OPS':
            return unknown
        if observation.get('complete') is not True or observation.get('accessible') is not True:
            return unknown
        seen_at = instant(observation['observed_at'])
        # Old exports are not live monitoring. Small clock skew is tolerated.
        if not -300 <= (now - seen_at).total_seconds() <= 900:
            return unknown
        checks = []
        for workflow, limit in LIMITS.items():
            rows = observation['workflows'][workflow]
            if not isinstance(rows, list) or len(rows) > 10000:
                return unknown
            candidates = []
            for row in rows:
                if row['event'] != 'schedule':
                    continue
                if row['status'] != 'completed':
                    continue
                conclusion = row['conclusion']
                if conclusion not in CONCLUSIONS:
                    return unknown
                finished = instant(row['completed_at'])
                if finished > now or finished > seen_at:
                    return unknown
                run_id = row['id']
                if type(run_id) is not int or run_id <= 0:
                    return unknown
                candidates.append((finished, run_id, conclusion))
            candidates.sort(reverse=True)
            successes = [r for r in candidates if r[2] == 'success']
            age = round((now - successes[0][0]).total_seconds()) if successes else None
            last_success_id = successes[0][1] if successes else None
            latest = candidates[0] if candidates else None
            if latest and latest[2] in BAD:
                status, code = 'ALERT', workflow + '_failed'
            elif age is None or age > limit:
                status, code = 'ALERT', workflow + '_stale'
            else:
                status, code = 'RECENT', workflow + '_recent_success'
            check = {'check': workflow, 'status': status, 'code': code,
                     'last_success_id': last_success_id, 'age_seconds': age,
                     'threshold_seconds': limit}
            if latest and latest[2] in BAD:
                check['failed_run_id'] = latest[1]
            checks.append(check)
        return {'schema': 'nona.cycles.v1', 'environment': 'isolated-test',
                'status': 'ALERT' if any(c['status'] == 'ALERT' for c in checks) else 'RECENT',
                'checks': checks}
    except (KeyError, TypeError, ValueError, OverflowError, AttributeError):
        return unknown


def main():
    try:
        raw = sys.stdin.buffer.read(1048577)
        if len(raw) > 1048576:
            raise ValueError('oversize_input')
        result = evaluate(json.loads(raw), dt.datetime.now(dt.timezone.utc))
    except Exception:
        result = {'schema': 'nona.cycles.v1', 'environment': 'isolated-test',
                  'status': 'UNVERIFIABLE', 'code': 'monitoring_unverifiable'}
    print(json.dumps(result))
    return 0 if result['status'] == 'RECENT' else 1


if __name__ == '__main__':
    sys.exit(main())
