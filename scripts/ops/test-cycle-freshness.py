import copy
import datetime as dt
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('cycles', Path(__file__).with_name('cycle-freshness.py'))
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
NOW = dt.datetime(2026, 10, 10, 17, 30, tzinfo=dt.timezone.utc)


def row(run_id=1, at='2026-10-10T17:00:00Z', event='schedule', conclusion='success'):
    return {'id': run_id, 'completed_at': at, 'event': event,
            'status': 'completed', 'conclusion': conclusion}


def fixture():
    return {'repository': 'tpenalba06/NONA-OPS', 'accessible': True, 'complete': True,
            'observed_at': NOW.isoformat(), 'workflows': {'health': [row()], 'backup': [row(2)]}}


class CyclesTests(unittest.TestCase):
    def test_recent_cycles(self):
        self.assertEqual(c.evaluate(fixture(), NOW)['status'], 'RECENT')

    def test_manual_success_does_not_hide_missing_cycle(self):
        data = fixture()
        data['workflows']['health'] = [row(at='2026-10-10T13:03:31Z'), row(3, event='workflow_dispatch')]
        result = c.evaluate(data, NOW)
        self.assertEqual(result['checks'][0]['code'], 'health_stale')
        self.assertEqual(result['checks'][1]['status'], 'RECENT')

    def test_failure_and_recovery(self):
        data = fixture()
        data['workflows']['health'].append(row(3, at='2026-10-10T17:20:00Z', conclusion='failure'))
        self.assertEqual(c.evaluate(data, NOW)['checks'][0]['code'], 'health_failed')
        data['workflows']['health'].append(row(4, at='2026-10-10T17:25:00Z'))
        self.assertEqual(c.evaluate(data, NOW)['status'], 'RECENT')

    def test_missing_backup_and_threshold(self):
        data = fixture()
        data['workflows']['backup'] = []
        self.assertEqual(c.evaluate(data, NOW)['checks'][1]['code'], 'backup_stale')
        data['workflows']['backup'] = [row(2, at='2026-10-09T05:30:00Z')]
        self.assertEqual(c.evaluate(data, NOW)['status'], 'RECENT')
        data['workflows']['backup'][0]['completed_at'] = '2026-10-09T05:29:59Z'
        self.assertEqual(c.evaluate(data, NOW)['checks'][1]['code'], 'backup_stale')

    def test_skipped_or_running_is_not_success(self):
        for conclusion in ['skipped', 'cancelled', 'neutral']:
            data = fixture()
            data['workflows']['health'] = [row(conclusion=conclusion)]
            self.assertEqual(c.evaluate(data, NOW)['checks'][0]['code'], 'health_stale')
        data['workflows']['health'][0]['status'] = 'in_progress'
        self.assertEqual(c.evaluate(data, NOW)['checks'][0]['code'], 'health_stale')

    def test_inaccessible_incomplete_wrong_repository_or_old_export(self):
        for key, value in [('accessible', False), ('complete', False),
                           ('repository', 'tpenalba06/HOSTBUDDY'),
                           ('observed_at', '2026-10-10T16:00:00Z')]:
            data = fixture(); data[key] = value
            self.assertEqual(c.evaluate(data, NOW)['status'], 'UNVERIFIABLE')

    def test_bad_times_and_sensitive_fields_never_leak(self):
        data = fixture()
        data['token'] = 'PRIVATE_CANARY'; data['exception'] = 'PRIVATE_CANARY'
        data['workflows']['health'][0]['message'] = 'PRIVATE_CANARY'
        self.assertNotIn('PRIVATE_CANARY', json.dumps(c.evaluate(data, NOW)))
        for bad in ['2026-10-10T18:00:00Z', '2026-10-10T17:00:00', 'PRIVATE_CANARY']:
            current = copy.deepcopy(data)
            current['workflows']['health'][0]['completed_at'] = bad
            result = c.evaluate(current, NOW)
            self.assertEqual(result['status'], 'UNVERIFIABLE')
            self.assertNotIn('PRIVATE_CANARY', json.dumps(result))


if __name__ == '__main__':
    unittest.main()
