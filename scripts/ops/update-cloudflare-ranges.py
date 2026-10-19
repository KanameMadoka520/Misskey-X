#!/usr/bin/env python3
"""Refresh this site's origin allowlist; retain the working file on any failure."""

import argparse
import fcntl
import ipaddress
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.request


TARGET = Path('/opt/1panel/www/sites/x.tcymc.space/security/cloudflare-ranges.conf')
CONTAINER = '1Panel-openresty'


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
    return ('# Managed by Misskey-X origin maintenance; official Cloudflare IPv4 + IPv6.\n'
            '# Sources: https://www.cloudflare.com/ips-v4 and /ips-v6\n'
            + ''.join(f'{network} 1;\n' for network in networks))


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
    rendered = render_ranges(networks)
    if args.check:
        print(f'Validated {len(networks)} official IPv4/IPv6 ranges; no changes applied.')
        return
    if not TARGET.is_file():
        raise RuntimeError('Initial allowlist must be installed and reviewed before automatic updates')
    with TARGET.with_suffix('.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        previous = TARGET.read_text()
        if previous == rendered:
            print(f'No change: {len(networks)} Cloudflare ranges already current.')
            return
        atomic_write(TARGET.with_suffix('.last-good'), previous)
        atomic_write(TARGET, rendered)
        try:
            nginx('-t')
            nginx('-s', 'reload')
        except Exception:
            atomic_write(TARGET, previous)
            nginx('-t')
            nginx('-s', 'reload')
            raise
        print(f'Updated {len(networks)} Cloudflare ranges; config validated and OpenResty reloaded.')


if __name__ == '__main__':
    main()
