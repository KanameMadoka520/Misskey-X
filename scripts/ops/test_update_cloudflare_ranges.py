"""Exercise paired origin/real-IP list updates without network or Docker access."""

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
        self.realip_target = self.target.with_name('cloudflare-realip.conf')
        self.previous = '# Previously reviewed allowlist\n173.245.48.0/20 1;\n'
        self.previous_realip = '# Previously reviewed trust list\nset_real_ip_from 173.245.48.0/20;\n'
        self.target.write_text(self.previous)
        self.realip_target.write_text(self.previous_realip)
        self.networks = {
            4: updater.parse_ranges(IPV4, 4),
            6: updater.parse_ranges(IPV6, 6),
        }
        self.enterContext(patch.object(updater, 'TARGET', self.target))
        self.enterContext(patch.object(updater, 'REALIP_TARGET', self.realip_target))
        self.enterContext(patch('sys.argv', [str(MODULE_PATH)]))
        self.enterContext(contextlib.redirect_stdout(io.StringIO()))
        self.fetch = self.enterContext(patch.object(
            updater, 'fetch_ranges', side_effect=lambda version: self.networks[version],
        ))
        self.nginx = self.enterContext(patch.object(updater, 'nginx'))

    def assert_previous_lists(self):
        self.assertEqual(self.target.read_text(), self.previous)
        self.assertEqual(self.realip_target.read_text(), self.previous_realip)

    def assert_current_lists(self):
        networks = self.networks[4] + self.networks[6]
        self.assertEqual(self.target.read_text(), updater.render_ranges(networks))
        self.assertEqual(self.realip_target.read_text(), updater.render_realip(networks))

    def assert_rollback_snapshots(self):
        self.assertEqual(self.target.with_suffix('.last-good').read_text(), self.previous)
        self.assertEqual(self.realip_target.with_suffix('.last-good').read_text(), self.previous_realip)

    def assert_no_snapshots(self):
        self.assertFalse(self.target.with_suffix('.last-good').exists())
        self.assertFalse(self.realip_target.with_suffix('.last-good').exists())

    def test_failed_second_fetch_preserves_existing_files(self):
        self.fetch.side_effect = [self.networks[4], URLError('upstream unavailable')]
        with self.assertRaises(URLError):
            updater.main()
        self.assert_previous_lists()
        self.nginx.assert_not_called()
        self.assert_no_snapshots()

    def test_invalid_second_feed_preserves_existing_files(self):
        self.fetch.side_effect = [self.networks[4], ValueError('invalid IPv6 feed')]
        with self.assertRaises(ValueError):
            updater.main()
        self.assert_previous_lists()
        self.nginx.assert_not_called()

    def test_unchanged_ranges_do_not_reload(self):
        networks = self.networks[4] + self.networks[6]
        self.target.write_text(updater.render_ranges(networks))
        self.realip_target.write_text(updater.render_realip(networks))
        updater.main()
        self.nginx.assert_not_called()
        self.assert_no_snapshots()

    def test_validation_failure_restores_and_reloads_previous_config(self):
        self.nginx.side_effect = [subprocess.CalledProcessError(1, 'nginx -t'), None, None]
        with self.assertRaises(subprocess.CalledProcessError):
            updater.main()
        self.assert_previous_lists()
        self.assert_rollback_snapshots()
        self.assertEqual(self.nginx.call_args_list, [call('-t'), call('-t'), call('-s', 'reload')])

    def test_reload_failure_restores_and_reloads_previous_config(self):
        self.nginx.side_effect = [None, subprocess.CalledProcessError(1, 'nginx reload'), None, None]
        with self.assertRaises(subprocess.CalledProcessError):
            updater.main()
        self.assert_previous_lists()
        self.assert_rollback_snapshots()
        self.assertEqual(self.nginx.call_args_list, [
            call('-t'), call('-s', 'reload'), call('-t'), call('-s', 'reload'),
        ])

    def test_success_loads_complete_pair_and_keeps_both_snapshots(self):
        self.nginx.side_effect = lambda *_: self.assert_current_lists()
        updater.main()
        self.assert_current_lists()
        self.assert_rollback_snapshots()
        self.assertEqual(self.nginx.call_args_list, [call('-t'), call('-s', 'reload')])
        self.assertEqual(self.fetch.call_args_list, [call(4), call(6)])

    def test_missing_either_initial_list_refuses_update(self):
        for target, previous in [
            (self.target, self.previous),
            (self.realip_target, self.previous_realip),
        ]:
            with self.subTest(target=target.name):
                target.unlink()
                with self.assertRaisesRegex(RuntimeError, 'Both initial lists'):
                    updater.main()
                self.assertFalse(target.exists())
                target.write_text(previous)
                self.assert_previous_lists()
                self.assert_no_snapshots()
                self.nginx.assert_not_called()

    def test_check_does_not_write_or_reload(self):
        with patch('sys.argv', [str(MODULE_PATH), '--check']):
            updater.main()
        self.assert_previous_lists()
        self.assert_no_snapshots()
        self.nginx.assert_not_called()

    def test_trust_list_drift_is_repaired_when_origin_ranges_match(self):
        self.target.write_text(updater.render_ranges(self.networks[4] + self.networks[6]))
        updater.main()
        self.assert_current_lists()
        self.assertEqual(self.nginx.call_args_list, [call('-t'), call('-s', 'reload')])

    def test_failed_second_replacement_restores_both_before_reload(self):
        real_atomic_write = updater.atomic_write

        def fail_candidate_trust_write(path, text):
            if path == self.realip_target and text != self.previous_realip:
                raise OSError('simulated second file replacement failure')
            real_atomic_write(path, text)

        self.nginx.side_effect = lambda *_: self.assert_previous_lists()
        with patch.object(updater, 'atomic_write', side_effect=fail_candidate_trust_write):
            with self.assertRaises(OSError):
                updater.main()
        self.assert_previous_lists()
        self.assert_rollback_snapshots()
        self.assertEqual(self.nginx.call_args_list, [call('-t'), call('-s', 'reload')])

    def test_backup_failure_does_not_change_either_live_list(self):
        real_atomic_write = updater.atomic_write

        def fail_second_backup(path, text):
            if path == self.realip_target.with_suffix('.last-good'):
                raise OSError('simulated backup failure')
            real_atomic_write(path, text)

        with patch.object(updater, 'atomic_write', side_effect=fail_second_backup):
            with self.assertRaises(OSError):
                updater.main()
        self.assert_previous_lists()
        self.nginx.assert_not_called()

    def test_failed_restore_attempts_both_files_and_refuses_reload(self):
        real_atomic_write = updater.atomic_write

        def fail_origin_restore(path, text):
            if path == self.target and text == self.previous:
                raise OSError('simulated restore failure')
            real_atomic_write(path, text)

        self.nginx.side_effect = subprocess.CalledProcessError(1, 'nginx -t')
        with patch.object(updater, 'atomic_write', side_effect=fail_origin_restore):
            with self.assertRaisesRegex(RuntimeError, 'Could not restore both Cloudflare lists'):
                updater.main()
        self.assertEqual(self.realip_target.read_text(), self.previous_realip)
        self.assertEqual(self.nginx.call_args_list, [call('-t')])


if __name__ == '__main__':
    unittest.main()
