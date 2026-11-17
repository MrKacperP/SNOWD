import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

W, H = 1320, 2868
FONT = "/System/Library/Fonts/SFNS.ttf"

def font(size, weight):
    f = ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_axes([100, 28 if size < 60 else 80, 400, weight])
    except Exception:
        pass
    return f

# Redact the street address on the service-area screen.
area = Image.open(f"{S}/raw/area.png").convert("RGB")
d = ImageDraw.Draw(area)
d.rectangle((228, 486, 930, 556), fill=(255, 255, 255))
d.text((238, 492), "Mississauga, ON", font=font(47, 700), fill=(22, 38, 54))
area.save(f"{S}/raw/area_clean.png")

SHOTS = [
    ("onboarding", "Clear snow or\nget it cleared", "Set up in about a minute"),
    ("home", "Jobs come to you", "We notify you the moment a\nneighbour needs a hand"),
    ("prices", "Set your own prices", "See what shovelers near you charge"),
    ("area_clean", "Choose where\nyou work", "Only get requests from the\ncities you pick"),
    ("profile", "A profile people trust", "Ratings, reviews and ID checks"),
]

TOP = (12, 26, 110)
BOT = (38, 84, 255)

def background():
    bg = Image.new("RGB", (W, H))
    px = bg.load()
    for y in range(H):
        t = y / (H - 1)
        c = tuple(int(TOP[i] + (BOT[i] - TOP[i]) * t) for i in range(3))
        for x in range(W):
            px[x, y] = c
    return bg

base_bg = background()

for i, (name, title, sub) in enumerate(SHOTS, 1):
    img = base_bg.copy()
    d = ImageDraw.Draw(img)
    tf, sf = font(104, 800), font(52, 500)
    y = 170
    for line in title.split("\n"):
        w = d.textlength(line, font=tf)
        d.text(((W - w) / 2, y), line, font=tf, fill="white")
        y += 124
    y += 20
    for line in sub.split("\n"):
        w = d.textlength(line, font=sf)
        d.text(((W - w) / 2, y), line, font=sf, fill=(214, 225, 255))
        y += 68

    shot = Image.open(f"{S}/raw/{name}.png").convert("RGB")
    sw = 1010
    sh = round(shot.height * sw / shot.width)
    shot = shot.resize((sw, sh), Image.LANCZOS)
    top = H - sh - 70
    top = max(top, y + 50)
    x = (W - sw) // 2
    r = 110

    shadow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(shadow).rounded_rectangle((x - 6, top + 24, x + sw + 6, top + sh + 30), r, fill=150)
    shadow = shadow.filter(ImageFilter.GaussianBlur(40))
    img.paste(Image.new("RGB", (W, H), (5, 10, 50)), (0, 0), shadow)

    bezel = 16
    ImageDraw.Draw(img).rounded_rectangle((x - bezel, top - bezel, x + sw + bezel, top + sh + bezel), r + bezel, fill=(16, 18, 28))
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh - 1), r, fill=255)
    img.paste(shot, (x, top), mask)

    img.save(f"{OUT}/{i:02d}-{name.replace('_clean', '')}.png")
    print("wrote", i, name, top)
