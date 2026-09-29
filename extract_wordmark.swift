import AppKit
import CoreText

struct Shape: Encodable { let color: String; let points: [[Double]] }

func flatten(_ path: CGPath, xOffset: CGFloat, yOffset: CGFloat, color: String) -> [Shape] {
    var shapes: [Shape] = []
    var points: [[Double]] = []
    var current = CGPoint.zero
    var start = CGPoint.zero
    func add(_ p: CGPoint) { points.append([Double(p.x + xOffset), Double(p.y + yOffset)]) }
    func finish() { if points.count > 1 { shapes.append(Shape(color: color, points: points)) }; points = [] }
    func cubic(_ a: CGPoint, _ b: CGPoint, _ c: CGPoint, _ d: CGPoint, _ t: CGFloat) -> CGPoint {
        let u = 1 - t
        return CGPoint(x: u*u*u*a.x + 3*u*u*t*b.x + 3*u*t*t*c.x + t*t*t*d.x,
                       y: u*u*u*a.y + 3*u*u*t*b.y + 3*u*t*t*c.y + t*t*t*d.y)
    }
    path.applyWithBlock { elementPtr in
        let e = elementPtr.pointee
        switch e.type {
        case .moveToPoint:
            finish(); current = e.points[0]; start = current; add(current)
        case .addLineToPoint:
            current = e.points[0]; add(current)
        case .addQuadCurveToPoint:
            // Core Text normally supplies cubics, but retain this for completeness.
            let control = e.points[0], end = e.points[1]
            for i in 1...10 { let t = CGFloat(i)/10; let u = 1-t; add(CGPoint(x: u*u*current.x + 2*u*t*control.x + t*t*end.x, y: u*u*current.y + 2*u*t*control.y + t*t*end.y)) }
            current = end
        case .addCurveToPoint:
            let c1 = e.points[0], c2 = e.points[1], end = e.points[2]
            for i in 1...12 { add(cubic(current, c1, c2, end, CGFloat(i)/12)) }
            current = end
        case .closeSubpath:
            add(start); current = start; finish()
        @unknown default: break
        }
    }
    finish()
    return shapes
}

let font = CTFontCreateWithName("Verdana-Bold" as CFString, 82, nil)
let chars = Array("snowd.ca")
var advance: CGFloat = 0
var shapes: [Shape] = []
for char in chars {
    var unicode = Array(String(char).utf16)
    var glyph: CGGlyph = 0
    CTFontGetGlyphsForCharacters(font, &unicode, &glyph, 1)
    let color = char == "." ? "orange" : "navy"
    if let path = CTFontCreatePathForGlyph(font, glyph, nil) {
        shapes += flatten(path, xOffset: advance, yOffset: 0, color: color)
    }
    var width = CGSize.zero
    CTFontGetAdvancesForGlyphs(font, .horizontal, [glyph], &width, 1)
    advance += width.width
}
let payload = try! JSONEncoder().encode(shapes)
print(String(data: payload, encoding: .utf8)!)
