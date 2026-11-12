"""New deduplication regression only; no network or previously acquired recipe."""
import datetime as dt
import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('inbox',Path(__file__).with_name('test-alert-inbox.py'))
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class WatermarkTest(unittest.TestCase):
    def test_an_event_sent_during_the_already_notified_job_is_not_repeated(self):
        stamp=lambda value:dt.datetime.fromisoformat(value.replace('Z','+00:00'))
        since=stamp('2026-10-13T00:00:00Z')
        now=stamp('2026-10-13T01:00:00Z')
        result=module.failure_watermark([
            {'status':'completed','conclusion':'failure','created_at':'2026-10-13T00:13:00Z','updated_at':'2026-10-13T00:13:30Z'},
            {'status':'completed','conclusion':'success','updated_at':'2026-10-13T00:50:00Z'},
            {'status':'in_progress','conclusion':None,'updated_at':'2026-10-13T00:55:00Z'},
        ],since,now)
        self.assertLess(stamp('2026-10-13T00:13:20Z'),result)
        self.assertEqual(result,stamp('2026-10-13T00:13:30Z'))


if __name__=='__main__':unittest.main()
