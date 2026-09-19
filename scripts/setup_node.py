"""Install the pinned official Node.js build inside this project (Linux/macOS)."""
from pathlib import Path
import hashlib
import platform
import re
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request

root = Path(__file__).resolve().parent.parent
version = (root / '.node-version').read_text().strip()
if not re.fullmatch(r'\d+\.\d+\.\d+', version):
    raise SystemExit('Invalid .node-version')
system = {'Linux': 'linux', 'Darwin': 'darwin'}.get(platform.system())
arch = {'x86_64': 'x64', 'AMD64': 'x64', 'aarch64': 'arm64', 'arm64': 'arm64'}.get(platform.machine())
if not system or not arch:
    raise SystemExit('Install the .node-version release from https://nodejs.org for this platform.')
tools_dir = root / '.tools'
destination = tools_dir / 'node'
if destination.exists():
    executable = destination / 'bin/node'
    if executable.is_file() and subprocess.check_output([executable, '--version'], text=True).strip() == f'v{version}':
        print(f'Node.js v{version} is already installed: {destination}')
        raise SystemExit(0)
    raise SystemExit(f'{destination} already exists with a different installation; nothing overwritten.')

stem = f'node-v{version}-{system}-{arch}'
filename = f'{stem}.tar.gz'
base = f'https://nodejs.org/dist/v{version}/'
with urllib.request.urlopen(base + 'SHASUMS256.txt', timeout=60) as response:
    checksums = dict((name.lstrip('*'), digest) for digest, name in
                     (line.split() for line in response.read().decode().splitlines()))
expected = checksums[filename]
tools_dir.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(dir=tools_dir, prefix='node-install-') as temporary:
    stage = Path(temporary)
    archive = stage / filename
    print(f'Downloading {base}{filename}', flush=True)
    with urllib.request.urlopen(base + filename, timeout=60) as response, archive.open('wb') as output:
        shutil.copyfileobj(response, output)
    actual = hashlib.sha256(archive.read_bytes()).hexdigest()
    if actual != expected:
        raise SystemExit('Node.js archive checksum mismatch; installation aborted.')
    with tarfile.open(archive) as bundle:
        bundle.extractall(stage, filter='data')
    (stage / stem).rename(destination)
    (tools_dir / 'node-checksum.txt').write_text(f'{actual}  {filename}\n')
print(f'Installed Node.js v{version}; SHA-256 verified against official SHASUMS256.txt.')
print('Run: source scripts/env.sh')
