"""Build editable SVG hoops and a depth-sorted, seamless SVG animation.

Only the central reference globe is raster. All four hoops are vector paths.
Run with Python's standard library; no image generation or raster editing.
"""
from pathlib import Path
import base64
import math

ROOT = Path(__file__).resolve().parent
TAU = math.tau
FRAMES, SEGMENTS, DURATION = 120, 72, 8
INK = '#17191c'
PALETTE = ['#777879', '#a3a39d', '#c5c6bf', '#dedccd', '#eee9d9']
RINGS = [
    ('externo', 108, 2.4, 0, 0, 1),
    ('meridiano', 98, 2.1, 76, 0, -2),
    ('equador', 88, 2.0, 0, 76, 2),
    ('diagonal', 79, 1.9, 0, 58, -3),
]

def project(ring, angle, radius, t):
    name, _, _, yaw, pitch, _ = ring
    x, y, z = radius * math.cos(angle), radius * math.sin(angle), 0
    pitch = TAU * t if name == 'externo' else math.radians(pitch)
    y, z = y * math.cos(pitch), y * math.sin(pitch)
    yaw = math.radians(yaw)
    x, z = x * math.cos(yaw) + z * math.sin(yaw), -x * math.sin(yaw) + z * math.cos(yaw)
    if name == 'diagonal':
        tilt = math.radians(-34)
        x, y = x * math.cos(tilt) - y * math.sin(tilt), x * math.sin(tilt) + y * math.cos(tilt)
    return x + 128, y + 128, z

def path(points):
    return 'M' + 'L'.join(f'{x:.2f},{y:.2f}' for x, y, _ in points) + 'Z'

def pieces(t, selected=None):
    t %= 1
    result = []
    for ring in RINGS:
        name, radius, width, _, _, turns = ring
        if selected and name != selected:
            continue
        phase = 0 if name == 'externo' else TAU * turns * t
        for i in range(SEGMENTS):
            a, b = TAU * i / SEGMENTS + phase, TAU * (i + 1) / SEGMENTS + phase
            p, q = project(ring, a, radius, t), project(ring, b, radius, t)
            dx, dy = q[0]-p[0], q[1]-p[1]
            length = math.hypot(dx, dy)
            nx, ny = (-dy/length*width, dx/length*width) if length > .00001 else (width, 0)
            # A round-section hoop retains its thickness when viewed edge-on.
            points = [(p[0]+nx, p[1]+ny, p[2]), (q[0]+nx, q[1]+ny, q[2]),
                      (q[0]-nx, q[1]-ny, q[2]), (p[0]-nx, p[1]-ny, p[2])]
            depth = sum(p[2] for p in points) / 4
            # Engraved radial ticks travel with the material, independent of inclination.
            shade = max(0, min(4, round(2 + 1.5 * math.cos(a - .7))))
            face = f'<path d="{path(points)}" fill="{PALETTE[shade]}" stroke="{PALETTE[shade]}" stroke-width=".3"/>'
            face += f'<path d="M{points[0][0]:.2f},{points[0][1]:.2f}L{points[1][0]:.2f},{points[1][1]:.2f}M{points[3][0]:.2f},{points[3][1]:.2f}L{points[2][0]:.2f},{points[2][1]:.2f}" fill="none" stroke="{INK}" stroke-width=".55"/>'
            if i % 4 == 0:
                face += f'<path d="M{p[0]+nx*.8:.2f},{p[1]+ny*.8:.2f}L{p[0]-nx*.8:.2f},{p[1]-ny*.8:.2f}" fill="none" stroke="{INK}" stroke-width=".65"/>'
            result.append((depth, face))
    return sorted(result, key=lambda item: item[0])

globe_data = base64.b64encode((ROOT.parent / 'progression/nucleo.png').read_bytes()).decode()
GLOBE = f'<g clip-path="url(#globe)"><image href="data:image/png;base64,{globe_data}" width="256" height="256"/></g>'
DEFS = '<defs><clipPath id="globe"><circle cx="128" cy="127" r="68"/></clipPath></defs>'

def svg(content, title, composite=False):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img"><title>{title}</title>{DEFS if composite else ""}{content}</svg>'

def frame(t, composite):
    items = pieces(t)
    back = ''.join(face for depth, face in items if depth < 0)
    front = ''.join(face for depth, face in items if depth >= 0)
    return back + (GLOBE if composite else '') + front

def animated(composite):
    # One visible vector frame at a time. The first frame is also the SMIL fallback.
    # The endpoint is excluded: t=1 is identical to t=0, without a duplicate hold.
    content = []
    for i in range(FRAMES):
        opacity = '1' if i == 0 else '0'
        if i == 0:
            keys, values = f'0;{1/FRAMES:.8f};1', '1;0;0'
        else:
            keys = f'0;{i/FRAMES:.8f};{(i+1)/FRAMES:.8f};1' if i < FRAMES-1 else f'0;{i/FRAMES:.8f};1'
            values = '0;1;0;0' if i < FRAMES-1 else '0;1;0'
        content.append(f'<g opacity="{opacity}"><animate attributeName="opacity" dur="{DURATION}s" repeatCount="indefinite" calcMode="discrete" keyTimes="{keys}" values="{values}"/>{frame(i/FRAMES, composite=False)}</g>')
    if composite:
        # The globe belongs between the rear and front geometry in every frame.
        # Store it once, referenced in each frame instead of duplicating its pixels.
        content = []
        for i in range(FRAMES):
            items = pieces(i/FRAMES)
            back = ''.join(face for depth, face in items if depth < 0)
            front = ''.join(face for depth, face in items if depth >= 0)
            keys = f'0;{1/FRAMES:.8f};1' if i == 0 else (f'0;{i/FRAMES:.8f};{(i+1)/FRAMES:.8f};1' if i < FRAMES-1 else f'0;{i/FRAMES:.8f};1')
            values = '1;0;0' if i == 0 else ('0;1;0;0' if i < FRAMES-1 else '0;1;0')
            content.append(f'<g opacity="{1 if i == 0 else 0}"><animate attributeName="opacity" dur="{DURATION}s" repeatCount="indefinite" calcMode="discrete" keyTimes="{keys}" values="{values}"/>{back}<use href="#core"/>{front}</g>')
        content.insert(0, f'<defs><g id="core">{GLOBE}</g></defs>')
    return svg(''.join(content), 'Órbitas — quatro aros vetoriais independentes', composite)

for name, *_ in RINGS:
    (ROOT / f'aro-{name}.svg').write_text(svg(''.join(p for _, p in pieces(0, name)), f'Aro {name} — vetor editável'))
(ROOT / 'aros.svg').write_text(svg(frame(0, False), 'Quatro aros — vetores editáveis'))
(ROOT / 'aros-animados.svg').write_text(animated(False))
(ROOT / 'orbitas-animada.svg').write_text(animated(True))
(ROOT / 'orbitas-estatica.svg').write_text(svg(frame(0, True), 'Órbitas — imagem estática', True))
for index, t in enumerate([0, .125, .25, .375]):
    (ROOT / f'pose-{index}.svg').write_text(svg(frame(t, True), f'Órbitas — pose {index}', True))
assert frame(0, False) == frame(1, False), 'Geometry must close exactly over the loop'
print(f'Built 4 editable hoops, stills and {FRAMES}-frame SVG loops ({DURATION}s).')
