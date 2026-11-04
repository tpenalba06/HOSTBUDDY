"""Prepared guide-media export after explicit approval; no TEST/signup mutations."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import time
import urllib.parse
import zipfile

spec = importlib.util.spec_from_file_location('commercial_approval', Path(__file__).with_name('commercial-database-backup.py'))
approval_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(approval_module)


def engine(approval_file):
    spec = importlib.util.spec_from_file_location('approved_commercial_media', Path(__file__).with_name('storage-backup.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    target = approval_module.approval(json.loads(module.private_file(approval_file)))
    module.TEST_REF = target
    return module, target


def backup(module, target, output, key, configuration):
    output = Path(output).absolute()
    parent = output.parent.resolve()
    if output.is_symlink() or output.exists() or parent.is_relative_to(module.REPO) or any((p / '.git').exists() for p in [parent, *parent.parents]) or not parent.is_dir() or parent.stat().st_mode & 0o077:
        raise ValueError('private_new_output_required')
    output = parent / output.name
    module.safe_configuration(configuration)
    if configuration.get('project_ref') != approval_module.COMMERCIAL_REF or configuration.get('environment') != 'commercial-preparation':
        raise ValueError('commercial_configuration_required')
    buckets = [b for b in target.json('/storage/v1/bucket') if b.get('id') == 'guide-media']
    if len(buckets) != 1 or buckets[0].get('public') is not False:
        raise ValueError('private_guide_media_required')
    before = target.inventory(buckets)
    settings = target.json('/auth/v1/settings')
    # Capture the real Auth settings; never fake disable_signup or modify Auth.
    with tempfile.TemporaryFile() as archive:
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
            objects = []
            total = 0
            for i, obj in enumerate(before):
                remaining = 16 * 1024 * 1024 - total
                if remaining <= 0:
                    raise ValueError('media_quota_limit')
                path = '/storage/v1/object/authenticated/guide-media/' + urllib.parse.quote(obj['name'], safe='/')
                data = target.request(path, limit=remaining)
                if len(data) != (obj.get('metadata') or {}).get('size', len(data)):
                    raise ValueError('media_size_mismatch')
                total += len(data)
                entry = f'objects/{i:06d}.bin'
                z.writestr(entry, data)
                objects.append({**obj, 'archive_path': entry, 'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
            after_buckets = [b for b in target.json('/storage/v1/bucket') if b.get('id') == 'guide-media']
            if before != target.inventory(buckets) or buckets != after_buckets or settings != target.json('/auth/v1/settings'):
                raise ValueError('media_changed_during_export')
            manifest = {'format': 1, 'project_ref': approval_module.COMMERCIAL_REF,
                'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'buckets': buckets,
                'objects': objects, 'auth_public_settings': settings, 'observed_configuration': configuration,
                'limitations': ['Guide-media only; SQL DB/Auth and secret/provider configuration are separate']}
            z.writestr('manifest.json', json.dumps(manifest, ensure_ascii=False))
        archive.seek(0)
        plain = archive.read()
    nonce = os.urandom(12)
    encrypted = module.MAGIC + nonce + module.AESGCM(key).encrypt(nonce, plain, module.MAGIC)
    proof = module.verify_bytes(encrypted, key, approval_module.COMMERCIAL_REF)
    module.atomic_private_write(output, encrypted)
    return proof


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['backup', 'verify'])
    parser.add_argument('--approval-file', required=True)
    parser.add_argument('--key-file', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--api-key-file')
    parser.add_argument('--configuration')
    args = parser.parse_args()
    try:
        module, ref = engine(args.approval_file)
        key = module.key_bytes(args.key_file)
        if args.action == 'verify':
            proof = module.verify_bytes(module.private_file(args.output), key, ref)
        else:
            target = module.Target(ref, module.private_file(args.api_key_file).decode().strip())
            config = json.loads(module.private_file(args.configuration))
            proof = backup(module, target, args.output, key, config)
        print(json.dumps({'schema': 'nona.media-backup.v1', 'environment': 'commercial-authorized', 'status': 'PASS', **proof}))
        return 0
    except Exception:
        print('{"schema":"nona.media-backup.v1","environment":"commercial-preparation","status":"BLOCKED","code":"commercial_media_configuration_or_approval_required"}')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
