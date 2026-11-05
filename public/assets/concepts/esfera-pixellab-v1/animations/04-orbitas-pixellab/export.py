"""Download the PixelLab frames and package them without altering their pixels."""
from pathlib import Path
import concurrent.futures
import json
import sys
import urllib.request
from PIL import Image

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'manifest.json').read_text())
count = int(sys.argv[1])
frames_dir = root / 'frames'
frames_dir.mkdir(exist_ok=True)

def download(i):
    path = frames_dir / f'{i:02d}.png'
    data = urllib.request.urlopen(f"https://api.pixellab.ai/mcp/images/{manifest['job_id']}/download?index={i}", timeout=90).read()
    if data[:8].hex() != '89504e470d0a1a0a':
        raise ValueError(f'Frame {i} is not a PNG')
    path.write_bytes(data)
    return path

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    paths = list(pool.map(download, range(count)))
frames = [Image.open(path).convert('RGB') for path in paths]
assert all(im.size == (256, 256) for im in frames)
frames[0].save(root / 'animation.gif', save_all=True, append_images=frames[1:], duration=160, loop=0, disposal=2)
sheet = Image.new('RGB', (256 * 6, 256 * 2), '#000000')
for k in range(12):
    index = round(k * (count-1) / 11)
    sheet.paste(frames[index], ((k % 6)*256, (k // 6)*256))
sheet.save(root / 'contact-sheet.png')
manifest.update(status='completed', downloaded_frame_count=count, playback_frame_ms=160, gif='animation.gif')
(root / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(f'Downloaded {count} original PNG frames and exported animation.gif')
