#!/usr/bin/env python3
"""Refresh origin and real-IP trust lists together; roll back failed updates."""

import argparse
import fcntl
import ipaddress
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.request


TARGET = Path('/opt/1panel/www/sites/x.tcymc.space/security/cloudflare-ranges.conf')
REALIP_TARGET = TARGET.with_name('cloudflare-realip.conf')
CONTAINER = '1Panel-openresty'
HEADER = ('# Managed by Misskey-X origin maintenance; official Cloudflare IPv4 + IPv6.\n'
          '# Sources: https://www.cloudflare.com/ips-v4 and /ips-v6\n')


def parse_ranges(text, version):
    lines = text.strip().splitlines()
    minimum = 10 if version == 4 else 5
    if not minimum <= len(lines) <= 128:
        raise ValueError(f'Unexpected IPv{version} range count: {len(lines)}')
    networks = [ipaddress.ip_network(line.strip(), strict=True) for line in lines]
    for network in networks:
        if network.version != version or not network.is_global:
            raise ValueError(f'Invalid public IPv{version} network: {network}')
        if network.prefixlen < (8 if version == 4 else 19):
            raise ValueError(f'Refusing overly broad network: {network}')
    if len(set(networks)) != len(networks):
        raise ValueError('Duplicate networks')
    return networks


def fetch_ranges(version):
    url = f'https://www.cloudflare.com/ips-v{version}'
    request = urllib.request.Request(url, headers={'User-Agent': 'Misskey-X-origin-maintenance/1.0'})
    with urllib.request.urlopen(request, timeout=20) as response:
        if response.geturl() != url:
            raise ValueError('Unexpected redirect of authoritative range endpoint')
        data = response.read(16385)
    if len(data) > 16384:
        raise ValueError('Oversized range response')
    return parse_ranges(data.decode('ascii'), version)


def render_ranges(networks):
    return HEADER + ''.join(f'{network} 1;\n' for network in networks)


def render_realip(networks):
    return HEADER + ''.join(f'set_real_ip_from {network};\n' for network in networks)


def atomic_write(path, text):
    fd, name = tempfile.mkstemp(prefix='.cloudflare-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as stream:
            stream.write(text)
            stream.flush()
            os.fsync(stream.fileno())
            os.fchmod(stream.fileno(), 0o644)
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def nginx(*args):
    subprocess.run(['docker', 'exec', CONTAINER, 'nginx', *args], check=True, timeout=20)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Validate official data without writing or reloading')
    args = parser.parse_args()
    networks = fetch_ranges(4) + fetch_ranges(6)
    rendered = {
        TARGET: render_ranges(networks),
        REALIP_TARGET: render_realip(networks),
    }
    if args.check:
        print(f'Validated {len(networks)} official IPv4/IPv6 ranges; no changes applied.')
        return
    with TARGET.with_suffix('.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if not all(path.is_file() for path in rendered):
            raise RuntimeError('Both initial lists must be installed and reviewed before automatic updates')
        previous = {path: path.read_text() for path in rendered}
        if previous == rendered:
            print(f'No change: origin and real-IP trust lists already contain {len(networks)} Cloudflare ranges.')
            return
        for path, text in previous.items():
            atomic_write(path.with_suffix('.last-good'), text)
        try:
            # Each replacement is atomic. Never validate/reload a half-updated pair.
            for path, text in rendered.items():
                atomic_write(path, text)
            nginx('-t')
            nginx('-s', 'reload')
        except Exception:
            restore_errors = []
            for path, text in previous.items():
                try:
                    atomic_write(path, text)
                except Exception as error:
                    restore_errors.append(f'{path.name}: {error}')
            if restore_errors:
                raise RuntimeError(
                    'Could not restore both Cloudflare lists; refusing reload: '
                    + '; '.join(restore_errors)
                )
            nginx('-t')
            nginx('-s', 'reload')
            raise
        print(f'Updated both lists with {len(networks)} Cloudflare ranges; config validated and OpenResty reloaded.')


if __name__ == '__main__':
    main()
