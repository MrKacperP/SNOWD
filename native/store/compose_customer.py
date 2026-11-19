"""Composes the customer-side App Store screenshots (6.9", 1320x2868) from the captures in raw/.

The captures come from the dev build running against the local Firebase emulator, seeded with
made-up people (Sarah Mitchell, Northside Snow Co.) on a fictional street, so no real member's
data appears. Usage: python3 compose_customer.py <output folder>
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

S = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else f"{S}/screenshots-customer"
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


# The story of one booking, from the customer's side. Every caption describes what the screen shows.
SHOTS = [
    ("dashboard", "Snow day, sorted", "Your shoveler and your order,\nright on the home screen"),
    ("driveway", "Set up in a minute", "Tell us about your driveway once"),
    ("request", "Book a local shoveler", "See the full price before you send"),
    ("workorder", "Every detail in\none work order", "Card held, charged only\nwhen the work is done"),
    ("progress", "Watch them arrive", "Live progress from booked to done"),
    ("messages", "Chat with your shoveler", "Share gate codes and extra requests"),
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


def with_island(shot):
    """Simulator captures only sometimes include the Dynamic Island; draw it on every shot so the set matches."""
    shot = shot.copy()
    ImageDraw.Draw(shot).rounded_rectangle((415, 42, 791, 152), 55, fill=(0, 0, 0))
    return shot


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

    shot = with_island(Image.open(f"{S}/raw/{name}.png").convert("RGB"))
    sw = 1010
    sh = round(shot.height * sw / shot.width)
    shot = shot.resize((sw, sh), Image.LANCZOS)
    top = max(H - sh - 70, y + 50)
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

    img.save(f"{OUT}/{i:02d}-{name}.png")
    print("wrote", i, name, top)
