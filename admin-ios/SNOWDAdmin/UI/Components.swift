import SwiftUI

extension Color {
    static let snowBlue = Color(red: 0.141, green: 0.510, blue: 0.976)
    static let snowInk = Color(red: 0.11, green: 0.12, blue: 0.15)
}

enum Fmt {
    static func money(_ cents: Double?) -> String {
        (Double(cents ?? 0) / 100).formatted(.currency(code: "CAD").presentation(.narrow))
    }
    static func dollars(_ value: Double?) -> String { (value ?? 0).formatted(.currency(code: "CAD").presentation(.narrow)) }
    static func ago(_ date: Date?) -> String {
        guard let date else { return "Never" }
        if Date().timeIntervalSince(date) < 60 { return "Just now" }
        return date.formatted(.relative(presentation: .named))
    }
    static func ago(ms: Double?) -> String { ago(ms.map { Date(timeIntervalSince1970: $0 / 1000) }) }
    static func day(ms: Double?) -> String {
        guard let ms else { return "—" }
        return Date(timeIntervalSince1970: ms / 1000).formatted(date: .abbreviated, time: .shortened)
    }
    static func short(_ id: String) -> String { "#" + id.prefix(6).uppercased() }
    static func title(_ raw: String?) -> String {
        guard let raw, !raw.isEmpty else { return "—" }
        return raw.replacingOccurrences(of: "-", with: " ").replacingOccurrences(of: "_", with: " ").capitalized
    }
}

/// Blue or black gradient tile with a glass trend chip, as on the overview screen.
struct StatTile: View {
    let title: String
    let value: String
    let detail: String
    let symbol: String
    var dark = false

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text(title).font(.subheadline.weight(.medium))
                Spacer()
                Image(systemName: symbol).font(.footnote.weight(.semibold))
                    .frame(width: 34, height: 26)
                    .glassEffect(.regular.tint(.white.opacity(0.12)), in: .capsule)
            }
            HStack(alignment: .firstTextBaseline) {
                Text(value).font(.title3.weight(.bold)).monospacedDigit().contentTransition(.numericText())
                Spacer(minLength: 4)
                Text(detail).font(.caption.weight(.medium)).opacity(0.85).lineLimit(1)
            }
        }
        .foregroundStyle(.white)
        .padding(14)
        .background(
            LinearGradient(colors: dark ? [Color(white: 0.24), Color(white: 0.06)] : [Color(red: 0.32, green: 0.62, blue: 1), .snowBlue],
                           startPoint: .topLeading, endPoint: .bottomTrailing),
            in: .rect(cornerRadius: 20)
        )
        .accessibilityElement(children: .combine)
    }
}

struct Card<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 0) { content }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 20))
    }
}

struct Pill: View {
    let label: String
    var body: some View {
        Text(Fmt.title(label)).font(.caption.weight(.semibold))
            .padding(.horizontal, 9).padding(.vertical, 4)
            .foregroundStyle(tone.opacity(0.95))
            .background(tone.opacity(0.13), in: .capsule)
    }
    var tone: Color {
        switch label.lowercased() {
        case "paid", "complete", "completed", "approved", "resolved", "active", "today": .green
        case "held", "pending", "waiting", "open", "en-route", "accepted": .orange
        case "in-progress", "in progress", "card", "google": .blue
        case "refunded", "rejected", "cancelled", "suspended", "disabled", "flagged": .red
        case "admin", "apple", "operator": .purple
        default: .secondary
        }
    }
}

/// A label/value row with a hairline divider, like the order list cards.
struct InfoRow<Trailing: View>: View {
    let label: String
    var last = false
    @ViewBuilder var trailing: Trailing
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                Text(label).foregroundStyle(.secondary)
                Spacer(minLength: 8)
                trailing.multilineTextAlignment(.trailing).lineLimit(2)
            }
            .font(.subheadline)
            .padding(.vertical, 9)
            if !last { Divider() }
        }
    }
}
extension InfoRow where Trailing == Text {
    init(_ label: String, _ value: String?, last: Bool = false) {
        self.label = label; self.last = last; self.trailing = Text(value ?? "—")
    }
}

struct Avatar: View {
    let name: String
    var size: CGFloat = 26
    var body: some View {
        Text(name.split(separator: " ").prefix(2).compactMap(\.first).map(String.init).joined().uppercased())
            .font(.system(size: size * 0.38, weight: .bold))
            .frame(width: size, height: size)
            .foregroundStyle(.white)
            .background(Color(hue: Double(name.unicodeScalars.reduce(0) { $0 + Int($1.value) } % 360) / 360, saturation: 0.45, brightness: 0.7), in: .circle)
            .accessibilityHidden(true)
    }
}

struct Banner: View {
    let text: String
    var tone: Color = .red
    var body: some View {
        Label(text, systemImage: tone == .red ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
            .font(.subheadline.weight(.medium))
            .foregroundStyle(tone)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(tone.opacity(0.1), in: .rect(cornerRadius: 14))
    }
}

/// Runs an admin action with busy/error/success state and a confirmation step.
@MainActor
@Observable
final class ActionRunner {
    var busy = false
    var error: String?
    var success: String?
    func run(_ work: @escaping () async throws -> String?) async {
        guard !busy else { return }
        busy = true; error = nil; success = nil
        defer { busy = false }
        do { success = try await work() ?? "Saved." }
        catch { self.error = error.localizedDescription }
    }
}

struct ScreenState<Content: View>: View {
    let loading: Bool
    let error: String?
    let empty: Bool
    let emptyTitle: String
    let emptySymbol: String
    let retry: () async -> Void
    @ViewBuilder var content: Content

    var body: some View {
        if loading && empty {
            ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let error, empty {
            ContentUnavailableView {
                Label("Couldn't load", systemImage: "wifi.exclamationmark")
            } description: { Text(error) } actions: {
                Button("Try again") { Task { await retry() } }.buttonStyle(.glassProminent)
            }
        } else if empty {
            ContentUnavailableView(emptyTitle, systemImage: emptySymbol)
        } else {
            content
        }
    }
}
