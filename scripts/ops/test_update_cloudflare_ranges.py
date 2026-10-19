"""Exercise allowlist validation and rollback without network or Docker access."""

import contextlib
import importlib.util
import io
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import call, patch
from urllib.error import URLError


MODULE_PATH = Path(__file__).with_name('update-cloudflare-ranges.py')
SPEC = importlib.util.spec_from_file_location('update_cloudflare_ranges', MODULE_PATH)
updater = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(updater)

IPV4 = '\n'.join([
    '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22',
    '103.31.4.0/22', '141.101.64.0/18', '108.162.192.0/18',
    '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22',
    '198.41.128.0/17',
])
IPV6 = '\n'.join([
    '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32',
    '2405:b500::/32', '2405:8100::/32',
])


class RangeValidationTests(unittest.TestCase):
    def test_rejects_invalid_or_dangerous_feeds(self):
        for version, text, replacement in [
            (4, IPV4, '<html>service unavailable</html>'),
            (4, IPV4, '104.0.0.0/7'),
            (6, IPV6, '2000::/3'),
            (4, IPV4, '2606:4700::/32'),
            (6, IPV6, '173.245.48.0/20'),
            (4, IPV4, '127.0.0.0/8'),
            (6, IPV6, 'fc00::/19'),
            (4, IPV4, '173.245.48.1/20'),
        ]:
            with self.subTest(version=version, replacement=replacement):
                lines = text.splitlines()
                lines[0] = replacement
                with self.assertRaises(ValueError):
                    updater.parse_ranges('\n'.join(lines), version)

    def test_rejects_truncated_and_duplicate_feeds(self):
        for text in ['', '173.245.48.0/20', '\n'.join(['173.245.48.0/20'] * 10)]:
            with self.subTest(text=text):
                with self.assertRaises(ValueError):
                    updater.parse_ranges(text, 4)

    def test_accepts_public_cloudflare_ranges(self):
        self.assertEqual(len(updater.parse_ranges(IPV4, 4)), 10)
        self.assertEqual(len(updater.parse_ranges(IPV6, 6)), 5)


class RefreshSafetyTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.target = Path(temporary.name) / 'cloudflare-ranges.conf'
        self.previous = '# Previously reviewed allowlist\n173.245.48.0/20 1;\n'
        self.target.write_text(self.previous)
        self.networks = {
            4: updater.parse_ranges(IPV4, 4),
            6: updater.parse_ranges(IPV6, 6),
        }
        self.enterContext(patch.object(updater, 'TARGET', self.target))
        self.enterContext(patch('sys.argv', [str(MODULE_PATH)]))
        self.enterContext(contextlib.redirect_stdout(io.StringIO()))
        self.fetch = self.enterContext(patch.object(
            updater, 'fetch_ranges', side_effect=lambda version: self.networks[version],
        ))
        self.nginx = self.enterContext(patch.object(updater, 'nginx'))

    def test_failed_second_fetch_preserves_existing_file(self):
        self.fetch.side_effect = [self.networks[4], URLError('upstream unavailable')]
        with self.assertRaises(URLError):
            updater.main()
        self.assertEqual(self.target.read_text(), self.previous)
        self.nginx.assert_not_called()
        self.assertFalse(self.target.with_suffix('.last-good').exists())

    def test_invalid_second_feed_preserves_existing_file(self):
        self.fetch.side_effect = [self.networks[4], ValueError('invalid IPv6 feed')]
        with self.assertRaises(ValueError):
            updater.main()
        self.assertEqual(self.target.read_text(), self.previous)
        self.nginx.assert_not_called()

    def test_unchanged_ranges_do_not_reload(self):
        self.target.write_text(updater.render_ranges(self.networks[4] + self.networks[6]))
        updater.main()
        self.nginx.assert_not_called()
        self.assertFalse(self.target.with_suffix('.last-good').exists())

    def test_validation_failure_restores_and_reloads_previous_config(self):
        self.nginx.side_effect = [subprocess.CalledProcessError(1, 'nginx -t'), None, None]
        with self.assertRaises(subprocess.CalledProcessError):
            updater.main()
        self.assertEqual(self.target.read_text(), self.previous)
        self.assertEqual(self.target.with_suffix('.last-good').read_text(), self.previous)
        self.assertEqual(self.nginx.call_args_list, [call('-t'), call('-t'), call('-s', 'reload')])

    def test_reload_failure_restores_and_reloads_previous_config(self):
        self.nginx.side_effect = [None, subprocess.CalledProcessError(1, 'nginx reload'), None, None]
        with self.assertRaises(subprocess.CalledProcessError):
            updater.main()
        self.assertEqual(self.target.read_text(), self.previous)
        self.assertEqual(self.target.with_suffix('.last-good').read_text(), self.previous)
        self.assertEqual(self.nginx.call_args_list, [
            call('-t'), call('-s', 'reload'), call('-t'), call('-s', 'reload'),
        ])

    def test_success_keeps_rollback_snapshot(self):
        updater.main()
        self.assertEqual(
            self.target.read_text(),
            updater.render_ranges(self.networks[4] + self.networks[6]),
        )
        self.assertEqual(self.target.with_suffix('.last-good').read_text(), self.previous)
        self.assertEqual(self.nginx.call_args_list, [call('-t'), call('-s', 'reload')])


if __name__ == '__main__':
    unittest.main()
