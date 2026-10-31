#!/usr/bin/env python3
"""Make the updater's Windows zip: release-zip.py <packaged folder> <out.zip>."""
import argparse
import hashlib
from pathlib import Path
import zipfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    source, output = args.source.resolve(), args.output.resolve()
    repo = Path(__file__).resolve().parent.parent
    top = 'Toaster-win32-x64'
    required = ['Toaster.exe', 'resources/app.asar']
    notices = {
        'LICENSE': 'TOASTER-LICENSE.txt',
        'THIRD-PARTY-NOTICES.txt': 'THIRD-PARTY-NOTICES.txt',
        'licenses/Apache-2.0.txt': 'licenses/Apache-2.0.txt',
        'licenses/thinking-orbs-MIT.txt': 'licenses/thinking-orbs-MIT.txt',
    }
    if not all((source / name).is_file() for name in required):
        parser.error(f'no complete build at {source}')
    if output == source or source in output.parents:
        parser.error('the output zip must be outside the packaged folder')
    for name in notices:
        if not (repo / name).is_file():
            parser.error(f'missing notice: {name}')
    # Notices replace any packaged copies, so every archive name occurs once.
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for file in sorted(source.rglob('*')):
            if file.is_file():
                relative = file.relative_to(source).as_posix()
                if relative not in notices.values():
                    archive.write(file, f'{top}/{relative}')
        for name, target in notices.items():
            archive.write(repo / name, f'{top}/{target}')
    with zipfile.ZipFile(output) as archive:
        names = archive.namelist()
        if (len(names) != len(set(names))
                or any('\\' in name or not name.startswith(top + '/') for name in names)
                or not all(f'{top}/{name}' in names for name in required)
                or archive.testzip() is not None):
            raise ValueError('release zip failed validation')
    digest = hashlib.sha256()
    with output.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b''):
            digest.update(chunk)
    checksum = digest.hexdigest()
    Path(str(output) + '.sha256').write_text(f'{checksum}  {output.name}\n', encoding='ascii')
    print('files', len(names), 'bytes', output.stat().st_size,
          'MB', round(output.stat().st_size / 1048576, 1))
    print('sha256', checksum)


if __name__ == '__main__':
    main()
