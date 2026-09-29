"""Convert the extracted Verdana Bold wordmark outlines to a two-colour DST."""
import json
from math import ceil
import sys
sys.path.insert(0, '/tmp/snowd-embroidery-validation')
from pyembroidery import EmbPattern, STITCH, JUMP, TRIM, COLOR_CHANGE, write_dst, read_dst

POINT_TO_DST, ROW_GAP, STITCH_GAP = 3.528, 0.4 / 0.3528, 6.2

def encode_delta(dx, dy, jump=False):
    out = [0, 0, 3 | (0x80 if jump else 0)]
    def ternary(v):
        result = []
        for _ in range(5):
            r = v % 3; d = -1 if r == 2 else r
            result.append(d); v = (v - d) // 3
        if v: raise ValueError("movement exceeds DST range")
        return result
    slots = [(0,1,2,128,64),(1,1,2,128,64),(0,4,8,32,16),(1,4,8,32,16),(2,4,8,32,16)]
    for digits, is_x in ((ternary(dx), True), (ternary(dy), False)):
        for d, (byte, xp, xn, yp, yn) in zip(digits, slots):
            if d == 1: out[byte] |= xp if is_x else yp
            elif d == -1: out[byte] |= xn if is_x else yn
    return bytes(out)

def points_between(a, b, gap=24):
    steps = max(1, ceil(max(abs(b[0]-a[0]), abs(b[1]-a[1])) / gap))
    return [(round(a[0]+(b[0]-a[0])*i/steps), round(a[1]+(b[1]-a[1])*i/steps)) for i in range(1, steps+1)]

def row_segments(contours, y):
    xs = []
    for c in contours:
        for a, b in zip(c, c[1:]):
            if (a[1] <= y < b[1]) or (b[1] <= y < a[1]): xs.append(a[0] + (y-a[1])*(b[0]-a[0])/(b[1]-a[1]))
    xs.sort(); return list(zip(xs[::2], xs[1::2]))

def main():
    raw = json.load(open("wordmark-paths.json")); groups = {"navy": [], "orange": []}
    for item in raw: groups[item["color"]].append(item["points"])
    allp = [p for cs in groups.values() for c in cs for p in c]
    # Put the lower-left of the design at the DST origin (headers expect positive extents).
    base_x, base_y = min(p[0] for p in allp), min(p[1] for p in allp)
    for color in groups:
        groups[color] = [[[p[0]-base_x, p[1]-base_y] for p in contour] for contour in groups[color]]
    allp = [p for cs in groups.values() for c in cs for p in c]
    min_x,max_x,min_y,max_y = min(p[0] for p in allp),max(p[0] for p in allp),min(p[1] for p in allp),max(p[1] for p in allp)
    cursor=(0,0); records=[]; visual=[]
    for index, color in enumerate(("navy", "orange")):
        if index: records.append("color")
        letters = []
        for contour in sorted(groups[color], key=lambda c: min(p[0] for p in c)):
            left, right = min(p[0] for p in contour), max(p[0] for p in contour)
            if letters and left <= letters[-1][0]:
                letters[-1][1].append(contour)
                letters[-1][0] = max(letters[-1][0], right)
            else: letters.append([right, [contour]])
        for _, contours in letters:
            records.append('trim')
            y=min(p[1] for c in contours for p in c)+ROW_GAP/2; direction=1
            top=max(p[1] for c in contours for p in c)
            while y < top:
                segments=row_segments(contours, y)
                if not direction: segments.reverse()
                for left,right in segments:
                    ends=((left,y),(right,y)) if direction else ((right,y),(left,y))
                    for endpoint, jump in ((ends[0],True),(ends[1],False)):
                        target=tuple(round(v*POINT_TO_DST) for v in endpoint)
                        for p in points_between(cursor,target): records.append((p[0]-cursor[0],p[1]-cursor[1],jump)); cursor=p
                    visual.append((color,ends))
                direction=1-direction; y+=ROW_GAP
    stitches=sum(isinstance(r,tuple) and not r[2] for r in records)
    dp=[(round(p[0]*POINT_TO_DST),round(p[1]*POINT_TO_DST)) for p in allp]
    header=("LA:snowd.ca\rST:{:7d}\rCO:  2\r+X:{:5d}\r-X:{:5d}\r+Y:{:5d}\r-Y:{:5d}\rAX:{:5d}\rAY:{:5d}\rMX:{:5d}\rMY:{:5d}\rPD:******\r").format(stitches,max(x for x,y in dp),-min(x for x,y in dp),max(y for x,y in dp),-min(y for x,y in dp),cursor[0],cursor[1],0,0)
    pattern = EmbPattern()
    pattern.add_thread('#102f40'); pattern.add_thread('#f58b32')
    for r in records:
        if r == 'color': pattern.add_command(COLOR_CHANGE)
        elif r == 'trim': pattern.add_command(TRIM)
        else: pattern.add_stitch_relative(JUMP if r[2] else STITCH, r[0], -r[1])
    pattern.end()
    write_dst(pattern, 'snowd-ca-logo.dst')
    decoded = read_dst('snowd-ca-logo.dst')
    print('Decoded DST:', decoded.bounds(), 'stitches:', decoded.count_stitch_commands(STITCH))
    with open("snowd-ca-logo-preview.svg","w") as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{min_x-8:.1f} {-max_y-8:.1f} {max_x-min_x+16:.1f} {max_y-min_y+16:.1f}"><rect x="-100" y="-100" width="1000" height="1000" fill="#e9f4f8"/>\n')
        for color, contours in groups.items():
            fill="#102f40" if color=="navy" else "#f58b32"
            path = ' '.join('M '+' L '.join(f'{x:.3f} {-y:.3f}' for x,y in c)+' Z' for c in contours)
            f.write(f'<path d="{path}" fill="{fill}" fill-rule="evenodd"/>\n')
        f.write("</svg>\n")

if __name__ == "__main__": main()
