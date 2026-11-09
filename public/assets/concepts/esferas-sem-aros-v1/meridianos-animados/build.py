"""Embed the original PixelLab globe and editable SVG renderer into one HTML."""
from pathlib import Path
import base64

root = Path(__file__).resolve().parent
image = base64.b64encode((root.parents[2] / 'sprites/esfera/layers/globe.png').read_bytes()).decode()
script = (root / 'renderer.js').read_text()
html = '''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Meridianos — esfera e aros animados</title>
<style>body{margin:0;color:var(--foreground,#dedccd);font-family:var(--font-sans,system-ui)}.art{max-width:512px;margin:auto;background:#000;border-radius:12px;overflow:hidden}svg{display:block;width:100%;height:auto}.controls{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;margin:14px 0}button,select{font:inherit;color:inherit;background:var(--secondary,#28282c);border:1px solid var(--border,#555);border-radius:6px;padding:8px 12px}p{text-align:center;font-size:13px;color:var(--muted-foreground,#aaa);margin:12px 0}</style>
<div class="art"><svg id="armillary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="art-title"><title id="art-title">Esfera com meridianos em giro horário e quatro aros vetoriais independentes</title><defs><clipPath id="globe-clip"><circle cx="256" cy="256" r="130"/></clipPath></defs><g id="rear"></g><g id="sphere" clip-path="url(#globe-clip)"><image href="data:image/png;base64,''' + image + '''" x="89.6" y="89.6" width="332.8" height="332.8"/></g><g id="front"></g></svg></div>
<div class="controls"><button id="play" type="button">Pausar</button><button id="invert" type="button">Inverter esfera</button><label>Velocidade <select id="speed"><option value=".5">0,5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label><button id="reset" type="button">Reiniciar</button><button id="export" type="button">Baixar aros SVG</button></div><p id="direction" role="status" aria-live="polite">Esfera: horário</p><p>Esfera: volta de 24 s · quatro aros independentes · ciclo de 48 s</p><script>''' + script + '</script></html>'
(root / 'preview.html').write_text(html)
print('Built standalone SVG preview using sprites/esfera/layers/globe.png.')
