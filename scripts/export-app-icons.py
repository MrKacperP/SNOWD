"""Export platform icons from the approved square artwork (requires Pillow)."""
from pathlib import Path
import base64
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'public/icons/snowd-source.png'
icon = Image.open(source).convert('RGB')
assert icon.width == icon.height, 'Source must be square; never stretch the artwork.'

def save(path, size):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    icon.resize((size, size), Image.Resampling.LANCZOS).save(target)

for path, size in [
    ('native/assets/icon.png', 1024),
    ('native/assets/favicon.png', 48),
    ('native/ios/SNOWD/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png', 1024),
    ('mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024),
    ('src/app/icon.png', 512),
    ('src/app/apple-icon.png', 180),
    ('public/icons/snowd-192.png', 192),
    ('public/icons/snowd-512.png', 512),
    ('public/icons/snowd-1024.png', 1024),
]:
    save(path, size)
icon.save(ROOT / 'public/favicon.ico', sizes=[(16,16), (32,32), (48,48)])
# SVG container intentionally embeds the approved PNG, not a redrawn approximation.
png = base64.b64encode(source.read_bytes()).decode()
(ROOT / 'public/icons/snowd.svg').write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">'
    '<title>SNOWD app icon</title>'
    f'<image width="1024" height="1024" href="data:image/png;base64,{png}"/></svg>\n'
)
# Adaptive icons have an extra outer area that launchers crop away.
blue = icon.getpixel((icon.width // 2, 10))
adaptive = Image.new('RGB', (1024,1024), blue)
adaptive.paste(icon.resize((682,682), Image.Resampling.LANCZOS), (171,171))
adaptive.save(ROOT / 'native/assets/android-icon-foreground.png')
Image.new('RGB', (1024,1024), blue).save(ROOT / 'native/assets/android-icon-background.png')
# Themed launcher mask: white face and orange beak, with transparent pupils/background.
mask = Image.new('RGBA', icon.size)
mask.putdata([(255,255,255,255 if (min(r,g,b)>180 or (r>150 and g>65 and b<130)) else 0)
              for r,g,b in icon.getdata()])
mono = Image.new('RGBA', (1024,1024))
mono.paste(mask.resize((682,682), Image.Resampling.LANCZOS), (171,171))
mono.save(ROOT / 'native/assets/android-icon-monochrome.png')
for path in (ROOT / 'mobile/android/app/src/main/res').glob('mipmap-*/*.png'):
    if path.name.startswith('ic_launcher'):
        size = Image.open(path).size
        image = adaptive if 'foreground' in path.name else icon
        image.resize(size, Image.Resampling.LANCZOS).save(path)
print('Exported native, browser, Apple touch, web app, and SVG icons.')
