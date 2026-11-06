"""Create a dependency-free, offline index.html from editable sources."""
from pathlib import Path
import base64
import json

ROOT = Path(__file__).parent

def uri(path, mime):
    return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode()

css = (ROOT / 'src/style.css').read_text(encoding='utf-8')
css = css.replace('../assets/hero.png', uri(ROOT / 'assets/hero.png', 'image/png'))
scripts = '\n'.join((ROOT / 'src' / name).read_text(encoding='utf-8') for name in ('engine.js', 'i18n.js', 'storage.js', 'app.js'))
scripts = scripts.replace('assets/logo-mark.png', uri(ROOT / 'assets/logo-mark.png', 'image/png'))
html = '<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#194f42"><meta name="description" content="My AI Treasures — 모임 지출과 개인별 송금 안내"><title>나의 AI 총무 · My AI Treasures</title><style>' + css + '</style></head><body><div id="app"></div><script>' + scripts + '</script></body></html>'
(ROOT / 'index.html').write_text(html, encoding='utf-8', newline='\n')
mark=uri(ROOT / 'assets/logo-mark.png','image/png')
for code,title in [('ko','나의 AI 총무'),('en','My AI Treasures'),('ja','マイAI総務')]:
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="680" height="120" viewBox="0 0 680 120"><title>{title}</title><image href="{mark}" width="110" height="110" y="5"/><text x="126" y="78" fill="#194f42" font-size="47" font-weight="800" font-family="system-ui,sans-serif" letter-spacing="-1">{title}</text></svg>'
    (ROOT / 'assets' / f'logo-{code}.svg').write_text(svg, encoding='utf-8', newline='\n')
print('Built index.html with embedded artwork and all three languages.')
