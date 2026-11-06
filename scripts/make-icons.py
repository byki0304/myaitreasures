"""Generate install icons (PWA, iOS, Windows/macOS desktop) from the two master images."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / 'assets' / 'icons'
MOBILE = Image.open(ICONS / 'source' / 'icon-mobile-master.png').convert('RGB')
DESKTOP = Image.open(ICONS / 'source' / 'icon-desktop-master.png').convert('RGB')


def resized(img, size):
    return img.resize((size, size), Image.LANCZOS)


def maskable(img, scale=0.72):
    # Android adaptive masks may crop to an 80% circle; keep the artwork inside it.
    w, h = img.size
    edge = [img.getpixel((x, y)) for x in (0, w - 1) for y in (0, h - 1)]
    bg = tuple(sum(c[i] for c in edge) // len(edge) for i in range(3))
    canvas = Image.new('RGB', img.size, bg)
    inner = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    canvas.paste(inner, ((w - inner.width) // 2, (h - inner.height) // 2))
    return canvas


def transparent_tile(img, threshold=236):
    # The desktop master is a tile on white; flood-fill the outer white to transparency.
    w, h = img.size
    marker = img.copy()
    for corner in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        ImageDraw.floodfill(marker, corner, (255, 0, 255), thresh=255 - threshold)
    mask = Image.new('L', img.size, 255)
    px, mp = marker.load(), mask.load()
    for y in range(h):
        for x in range(w):
            if px[x, y] == (255, 0, 255):
                mp[x, y] = 0
    mask = mask.filter(ImageFilter.GaussianBlur(1.2))
    out = img.convert('RGBA')
    out.putalpha(mask)
    return out.crop(out.getbbox()) if out.getbbox() else out


def square(img):
    side = max(img.size)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)
    return canvas


def main():
    for size in (192, 512):
        resized(MOBILE, size).save(ICONS / f'icon-{size}.png', optimize=True)
        resized(maskable(MOBILE), size).save(ICONS / f'icon-maskable-{size}.png', optimize=True)
    resized(MOBILE, 180).save(ICONS / 'apple-touch-icon.png', optimize=True)

    tile = square(transparent_tile(DESKTOP))
    margin = int(tile.width * 0.04)
    padded = Image.new('RGBA', (tile.width + 2 * margin,) * 2, (0, 0, 0, 0))
    padded.paste(tile, (margin, margin), tile)
    for size in (32, 256, 512, 1024):
        resized(padded, size).save(ICONS / f'icon-desktop-{size}.png', optimize=True)
    ico_sizes = [(s, s) for s in (16, 24, 32, 48, 64, 128, 256)]
    resized(padded, 256).save(ICONS / 'icon-desktop.ico', sizes=ico_sizes)
    resized(padded, 256).save(ROOT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
    print('Generated icons in', ICONS)


if __name__ == '__main__':
    main()
