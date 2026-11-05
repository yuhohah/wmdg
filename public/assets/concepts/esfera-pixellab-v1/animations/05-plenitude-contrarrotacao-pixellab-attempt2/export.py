"""Download the PixelLab frames and package them without altering their pixels."""
from pathlib import Path
import concurrent.futures
import json
import sys
import statistics
import urllib.request
from PIL import Image, ImageChops, ImageStat

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
frames = [Image.alpha_composite(Image.new('RGBA', (256,256), '#000000'), Image.open(path).convert('RGBA')).convert('RGB') for path in paths]
assert all(im.size == (256, 256) for im in frames)
def distance(a,b):
    return sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/3
adjacent = [distance(frames[i],frames[i+1]) for i in range(len(frames)-1)]
endpoint_distance = distance(frames[-1],frames[0])
endpoint_threshold = max(0.1, statistics.median(adjacent)*0.5)
redundant_endpoint = endpoint_distance <= endpoint_threshold
playback = frames[:]
while len(playback)>4 and distance(playback[-1],playback[0]) <= endpoint_threshold:
    playback.pop()
playback[0].save(root / 'animation.gif', save_all=True, append_images=playback[1:], duration=120, loop=0, disposal=2)
playback[0].save(root / 'animation.apng', format='PNG', save_all=True, append_images=playback[1:], duration=120, loop=0, disposal=0, blend=0)
deltas = [sum(ImageStat.Stat(ImageChops.difference(playback[i], playback[(i+1)%len(playback)])).mean)/3 for i in range(len(playback))]
manifest.update(playback_frame_count=len(playback), redundant_endpoint_removed=len(playback)!=len(frames), redundant_endpoint_count=len(frames)-len(playback), endpoint_distance=endpoint_distance, endpoint_removal_threshold=endpoint_threshold, transition_mean_absolute_rgb=deltas, apng='animation.apng')
sheet = Image.new('RGB', (256 * 6, 256 * 2), '#000000')
for k in range(12):
    index = round(k * (count-1) / 11)
    sheet.paste(frames[index], ((k % 6)*256, (k // 6)*256))
sheet.save(root / 'contact-sheet.png')
manifest.update(status='completed', downloaded_frame_count=count, playback_frame_ms=120, gif='animation.gif')
(root / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(f'Downloaded {count} original PNG frames and exported animation.gif')
