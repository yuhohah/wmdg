"""Give both native SVG previews a clockwise 24-second globe rotation."""
from pathlib import Path
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
NS = 'http://www.w3.org/2000/svg'
TAG = '{' + NS + '}'
ET.register_namespace('', NS)
for name in ['02-meridiano', '03-equador']:
    folder = ROOT / 'esfera-pixellab-v1/animations' / name
    root = ET.parse(folder / 'rotation.svg').getroot()
    if not any(node.get('id') == 'sphere-rotation' for node in root.iter()):
        image = next(root.iter(TAG + 'image'))
        parents = {child: parent for parent in root.iter() for child in parent}
        parent = parents[image]
        target = parent if parent.get('clip-path') == 'url(#globe)' else image
        container = parents[target]
        pivot = next(root.iter(TAG + 'clipPath')).find(TAG + 'circle')
        cx, cy = pivot.get('cx'), pivot.get('cy')
        wrapper = ET.Element(TAG + 'g', {'id': 'sphere-rotation'})
        ET.SubElement(wrapper, TAG + 'animateTransform', {
            'attributeName': 'transform', 'type': 'rotate',
            'from': f'0 {cx} {cy}', 'to': f'360 {cx} {cy}',
            'dur': '24s', 'repeatCount': 'indefinite', 'calcMode': 'linear',
            'data-base-duration': '24',
        })
        index = list(container).index(target)
        container.remove(target)
        wrapper.append(target)
        container.insert(index, wrapper)
    svg = ET.tostring(root, encoding='unicode')
    (folder / 'rotation.svg').write_text(svg + '\n')
    preview = (folder / 'preview.html').read_text()
    start, end = preview.index('<svg'), preview.index('</svg>') + len('</svg>')
    preview = preview[:start] + svg + preview[end:]
    new_speed = "svg.querySelectorAll('animate,animateTransform').forEach(a=>a.setAttribute('dur',(Number(a.getAttribute('data-base-duration')||8)*Number(e.target.value)/8)+'s'))"
    for old in ["svg.querySelectorAll('animate').forEach(a=>a.setAttribute('dur',seconds+'s'))", "svg.querySelectorAll('animate').forEach(a=>a.setAttribute('dur',e.target.value+'s'))"]:
        preview = preview.replace(old, new_speed)
    preview = preview.replace('const seconds=Number(e.target.value);', '')
    preview = preview.replace('Esfera fixa', 'Esfera em giro horário de 24 s')
    preview = preview.replace('One stationary globe', 'One rotating globe').replace('Globo fixo único', 'Globo giratório único')
    (folder / 'preview.html').write_text(preview)
    path = folder / 'manifest.json'
    data = json.loads(path.read_text())
    data.update(globe_rotation={'direction': 'clockwise', 'period_seconds': 24, 'axis': 'image plane'}, ring_cycle_seconds=8, combined_cycle_seconds=24)
    if 'duration_seconds' in data:
        data['duration_seconds'] = 24
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print('Meridiano and Equador: clockwise globe rotation; ring motion preserved.')
