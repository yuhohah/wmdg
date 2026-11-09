"""Apply the shared smooth-ring style to the two standalone SVG evolutions.

The Órbitas and final renderers use matching widths and color in their sources.
This only edits concept previews, not production game assets.
"""
from pathlib import Path
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
STYLE = json.loads((ROOT / 'ring-style.json').read_text())
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)

for name in ['02-meridiano', '03-equador']:
    folder = ROOT / 'esfera-pixellab-v1/animations' / name
    root = ET.fromstring((folder / 'rotation.svg').read_text())
    for parent in root.iter():
        for child in list(parent):
            if child.tag != f'{{{NS}}}use':
                continue
            # Keep a single solid band; remove borders, centre strokes and ticks.
            if child.get('stroke') not in ['#c5c6c7', STYLE['color']]:
                parent.remove(child)
                continue
            ring = 'equador' if 'equator' in child.get('href', '') else 'meridiano'
            child.set('stroke', STYLE['color'])
            child.set('stroke-width', str(STYLE['widths'][ring]))
    svg = ET.tostring(root, encoding='unicode')
    (folder / 'rotation.svg').write_text(svg + '\n')
    preview = (folder / 'preview.html').read_text()
    start, end = preview.index('<svg'), preview.index('</svg>') + len('</svg>')
    (folder / 'preview.html').write_text(preview[:start] + svg + preview[end:])
    manifest = folder / 'manifest.json'
    data = json.loads(manifest.read_text()) if manifest.exists() else {'stage': 2, 'name': 'Meridiano'}
    data['ring_style'] = STYLE
    manifest.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print('Updated Meridiano and Equador SVGs and embedded previews.')
