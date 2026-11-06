#!/usr/bin/env python3
"""Verify the guide with the CLI's separate native-evidence capture tool."""
import argparse
import hashlib
import html
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True
SITE = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cli-root', required=True, type=Path)
    parser.add_argument('--capture-tool', type=Path)
    parser.add_argument('--tool-revision', help='verify the external tool against this commit in the CLI object store')
    parser.add_argument('--out', required=True, type=Path)
    parser.add_argument('--chrome', required=True, help='installed headless Chrome/Chromium executable')
    args = parser.parse_args()
    cli, out = args.cli_root.resolve(), args.out.resolve()
    tool = (args.capture_tool or cli / 'tools/visual-evidence/capture.py').resolve()
    if not tool.is_file():
        parser.error('Supply the native-evidence tool from the CLI or an inspected, read-only export')
    if any(out == root or root in out.parents for root in (SITE, cli)) or out.exists() and any(out.iterdir()):
        parser.error('--out must be empty and outside both source repositories')
    if args.tool_revision:
        if not re.fullmatch('[0-9a-f]{40}', args.tool_revision):
            parser.error('--tool-revision must be a full commit ID')
        expected = subprocess.check_output(['git', '-C', str(cli), 'show', args.tool_revision + ':tools/visual-evidence/capture.py'])
        if expected != tool.read_bytes():
            parser.error('External tool bytes differ from the declared public revision')
    spec = importlib.util.spec_from_file_location('native_evidence', tool)
    capture = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(capture)
    capture.ROOT = cli
    scenarios = json.loads(subprocess.check_output([
        'node', '--input-type=module', '-e',
        'import {pathToFileURL} from "node:url"; const {scenarios}=await import(pathToFileURL(process.argv[1])); console.log(JSON.stringify(scenarios));',
        str(SITE / 'src/data/status-scenarios.mjs'),
    ], cwd=SITE))
    replay = json.loads((SITE / 'src/data/status-frames.json').read_text())
    fixture_digest = hashlib.sha256(json.dumps(
        [{'id': case['id'], 'snapshot': case['snapshot']} for case in scenarios],
        ensure_ascii=False, separators=(',', ':'),
    ).encode()).hexdigest()
    if fixture_digest != replay['fixtureDigest']:
        raise ValueError('Guide inputs changed; regenerate the committed native replay first')
    out.mkdir(parents=True, exist_ok=True)
    cases, mapping = [], {}
    for scenario in scenarios:
        for columns in replay['columns']:
            name = scenario['id'] + '-' + str(columns)
            contains = scenario['expect'] if columns == 100 else ['taba/wtc status'] + ['#' + row['number'] for row in scenario['snapshot']['prs']]
            associations = [[row['repo'], '#' + row['number']] for row in scenario['snapshot']['prs']]
            if columns == 100:
                associations += [[row['dir'], row['branch_display']] for row in scenario['snapshot']['repos']]
            cases.append({'name': name, 'columns': columns, 'rows': replay['rows'], 'frames': [{
                'at': 0, 'phase': scenario['id'], 'snapshot': scenario['snapshot'],
                'facts': [{} for _ in scenario['snapshot']['repos']], 'keys': [],
                'assert': {'contains': contains, 'same_row': associations, 'aligned': []},
            }]})
            mapping[name] = (scenario['id'], str(columns))
    report = {'kind': 'actual CLI View output; synthetic snapshots; independent terminal-cell verification',
              'tool_revision': args.tool_revision, 'tool_sha256': capture.digest(tool),
              'site_replay_revision': replay['sourceRevision'], 'fixture_digest': fixture_digest,
              'captures': [], 'passed': False,
              'limitations': ['Native renderer output, not live collectors or provider accounts.',
                              'PNG previews decode native ANSI through pyte/Chrome; terminal fonts and unsupported styles may differ.']}
    source = None
    with tempfile.TemporaryDirectory(prefix='status-guide-input-') as temporary:
        for start in range(0, len(cases), 6):
            batch = f'batch-{start // 6 + 1:02}'
            fixture = Path(temporary) / 'fixture.json'
            fixture.write_text(json.dumps({'version': 1, 'scenarios': cases[start:start + 6]}))
            capture.FIXTURE = fixture
            sys.argv = [str(tool), '--out', str(out / batch), '--chrome', args.chrome, '--require-png']
            if capture.main() != 0:
                raise ValueError(f'{batch}: native capture failed; inspect its retained diagnostics')
            manifest = json.loads((out / batch / 'manifest.json').read_text())
            if not manifest['passed'] or manifest['source_sha256'] != manifest['source_after_sha256']:
                raise ValueError(f'{batch}: source or capture verification failed')
            identity = (manifest['head'], manifest['source_sha256'])
            if source is not None and identity != source:
                raise ValueError(f'{batch}: source changed between capture batches')
            source = identity
            for scenario in manifest['scenarios']:
                case_id, width = mapping[scenario['name']]
                native = json.loads((out / batch / (scenario['name'] + '.native.json')).read_text())
                visible = capture.ANSI.sub('', native['frames'][0]['content'])
                if visible != replay['frames'][case_id][width]['plain']:
                    raise ValueError(f'{scenario["name"]}: captured output differs from the guide replay')
                report['captures'].append({'case': case_id, 'columns': int(width),
                    'source_revision': manifest['head'], 'batch': batch,
                    'png': f'{batch}/{scenario["name"]}-1.png',
                    'ansi': f'{batch}/{scenario["name"]}-1.ansi',
                    'preview': f'{batch}/{scenario["name"]}-1.html', 'matches_guide': True})
    report['passed'] = True
    report['source_revision'], report['source_sha256'] = source
    (out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    links = ''.join(f'<li>{html.escape(item["case"])} · {item["columns"]} columns: '
                    f'<a href="{item["png"]}">PNG</a> · <a href="{item["ansi"]}">native ANSI</a> · '
                    f'<a href="{item["preview"]}">cell preview</a> · '
                    f'<a href="{item["batch"]}/manifest.json">assertions and fingerprints</a></li>' for item in report['captures'])
    (out / 'index.html').write_text('<!doctype html><meta charset="utf-8"><title>Native status capture evidence</title>'
        '<h1>Native status capture evidence</h1><p>Actual CLI renderer output with synthetic facts. '
        'Every frame matches the guide and passes terminal-cell roundtrip checks. '
        'PNG typography can differ from your terminal.</p><a href="report.json">Provenance report</a><ul>' + links + '</ul>')
    print(f'PASS: {len(report["captures"])} native frames match the guide; PNGs and provenance retained outside Git')


if __name__ == '__main__':
    main()
