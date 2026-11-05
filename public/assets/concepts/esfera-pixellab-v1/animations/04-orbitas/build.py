"""Build the self-contained depth-tested animation from its source and PixelLab globe."""
from pathlib import Path
import base64
import json

root = Path(__file__).resolve().parent
globe = base64.b64encode((root.parent.parent / '01-nucleo.png').read_bytes()).decode()
renderer = (root / 'renderer.js').read_text()
html = '''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Órbitas — aros em profundidade</title><style>
body{margin:0;font-family:var(--font-sans,system-ui);color:var(--foreground,#ddd)}
.art{max-width:512px;margin:auto;border-radius:12px;overflow:hidden;background:#000}
canvas{display:block;width:100%;height:auto}
.controls{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:10px;margin:14px 0}
button,select{font:inherit;color:inherit;background:var(--secondary,#28282c);border:1px solid var(--border,#555);border-radius:6px;padding:7px 12px}
.timeline{display:flex;align-items:center;justify-content:center;gap:10px;font-size:12px;color:var(--muted-foreground,#aaa)}
input{width:min(300px,60%);accent-color:#c5c6c7}p{text-align:center;font-size:13px;color:var(--muted-foreground,#999);margin:12px 0}
</style><div class="art"><canvas id="orbit-canvas" width="512" height="512" aria-label="Esfera hermética com três aros em rotação e moldura externa fixa"></canvas></div>
<div class="controls"><button id="play" type="button">Pausar</button><label>Velocidade <select id="speed"><option value=".5">0,5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label><button id="reset" type="button">Reiniciar</button></div>
<label class="timeline">0 s <input id="time" aria-label="Posição no ciclo de 48 segundos" type="range" min="0" max="48" step=".01" value="0"> 48 s</label>
<p id="status">Carregando a gravura…</p>
<script id="globe-data" type="text/plain">data:image/png;base64,''' + globe + '''</script><script>''' + renderer + '</script></html>'
(root / 'preview.html').write_text(html)
manifest = {
    'stage': 4, 'name': 'Órbitas', 'size': [512, 512], 'cycle_seconds': 48,
    'renderer': 'WebGL, rigid annular meshes, per-fragment depth buffer',
    'base': '../../01-nucleo.png', 'globe_radius': 130,
    'rings': [
        {'name': 'Meridiano', 'radius': 174, 'width': 7, 'thickness': 2, 'period_seconds': 12, 'direction': 1},
        {'name': 'Equador', 'radius': 150, 'width': 9, 'thickness': 2, 'period_seconds': 16, 'direction': -1},
        {'name': 'Órbita oblíqua', 'radius': 199, 'width': 8, 'thickness': 2, 'period_seconds': 24, 'direction': 1},
        {'name': 'Moldura fixa', 'radius': 222, 'width': 5, 'thickness': 2, 'period_seconds': None}
    ],
    'integrated_in_game': False
}
(root / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(f'Built self-contained preview: {len(html)} characters')
