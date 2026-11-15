import Charts
import SwiftUI

struct OverviewView: View {
    @Environment(Session.self) private var session
    @Environment(Navigator.self) private var nav
    @State private var data: Overview?
    @State private var error: String?
    @State private var loading = true
    @State private var metric = Metric.signIns

    enum Metric: String, CaseIterable { case signIns = "Sign-ins", signUps = "Sign-ups", revenue = "Revenue" }

    var body: some View {
        NavigationStack {
            ScreenState(loading: loading, error: error, empty: data == nil, emptyTitle: "No data", emptySymbol: "chart.bar", retry: load) {
                if let data { content(data) }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Overview")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { Task { await load() } } label: { Image(systemName: "arrow.clockwise") }.accessibilityLabel("Refresh")
                }
            }
            .refreshable { await load() }
            .task { if data == nil { await load() } }
        }
    }

    private func content(_ d: Overview) -> some View {
        ScrollView {
            VStack(spacing: 14) {
                if let error { Banner(text: error) }
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                    Button { nav.tab = .logins } label: {
                        StatTile(title: "Sign-ins", value: "\(d.stats.signIns24h)", detail: "\(d.stats.signIns7d) this week", symbol: "arrow.up.right")
                    }
                    Button { nav.tab = .payments } label: {
                        StatTile(title: "Revenue", value: Fmt.money(d.stats.revenue30d), detail: "30 days", symbol: "dollarsign", dark: true)
                    }
                    Button { nav.tab = .manage } label: {
                        StatTile(title: "Accounts", value: "\(d.stats.accounts)", detail: "\(d.stats.operators) operators", symbol: "person.2.fill", dark: true)
                    }
                    Button { nav.tab = .verify } label: {
                        StatTile(title: "To verify", value: "\(d.stats.pendingVerifications)", detail: d.stats.pendingVerifications == 0 ? "All clear" : "Waiting", symbol: "checkmark.shield")
                    }
                }
                .buttonStyle(.plain)

                Card {
                    HStack(spacing: 16) {
                        ForEach(Metric.allCases, id: \.self) { m in
                            Button(m.rawValue) { withAnimation(.snappy) { metric = m } }
                                .font(.subheadline.weight(metric == m ? .semibold : .regular))
                                .foregroundStyle(metric == m ? Color.purple : .secondary)
                        }
                    }
                    .padding(.bottom, 12)
                    trend(points(d))
                }

                Card {
                    Text("Sign-in methods").font(.subheadline.weight(.semibold)).foregroundStyle(Color.snowBlue).padding(.bottom, 12)
                    methods(d.providers)
                }

                Card {
                    InfoRow("Payments (30 days)", "\(d.stats.payments30d)")
                    InfoRow("Card holds waiting", Fmt.money(d.stats.held))
                    InfoRow("Refunded (30 days)", Fmt.money(d.stats.refunded30d))
                    InfoRow("Active jobs", "\(d.stats.activeJobs)")
                    InfoRow("Open support chats", "\(d.stats.openSupport)")
                    InfoRow("Customers · Operators", "\(d.stats.clients) · \(d.stats.operators)", last: true)
                }
            }
            .padding(16)
        }
    }

    private func points(_ d: Overview) -> [Point] {
        switch metric { case .signIns: d.series.signIns; case .signUps: d.series.signUps; case .revenue: d.series.revenue.map { Point(day: $0.day, value: $0.value / 100) } }
    }

    private func trend(_ points: [Point]) -> some View {
        Chart(points) { p in
            AreaMark(x: .value("Day", p.date, unit: .day), y: .value(metric.rawValue, p.value))
                .foregroundStyle(LinearGradient(colors: [.purple.opacity(0.18), .purple.opacity(0)], startPoint: .top, endPoint: .bottom))
                .interpolationMethod(.monotone)
            LineMark(x: .value("Day", p.date, unit: .day), y: .value(metric.rawValue, p.value))
                .foregroundStyle(.purple)
                .interpolationMethod(.monotone)
            if p.value > 0 {
                PointMark(x: .value("Day", p.date, unit: .day), y: .value(metric.rawValue, p.value))
                    .symbolSize(28).foregroundStyle(.white)
                    .annotation(position: .overlay) { Circle().stroke(Color.snowInk, lineWidth: 1.5).frame(width: 7, height: 7) }
            }
        }
        .chartXAxis { AxisMarks(values: .stride(by: .day, count: 3)) { _ in AxisValueLabel(format: .dateTime.month(.abbreviated).day()) } }
        .chartYAxis { AxisMarks(position: .leading) { v in
            AxisGridLine().foregroundStyle(.quaternary)
            AxisValueLabel { if let n = v.as(Double.self) { Text(metric == .revenue ? Fmt.dollars(n) : "\(Int(n))") } }
        } }
        .frame(height: 190)
        .accessibilityLabel("\(metric.rawValue) over the last 14 days")
    }

    private func methods(_ shares: [Overview.Share]) -> some View {
        let top = shares.map(\.value).max() ?? 0
        return Chart(shares) { s in
            BarMark(x: .value("Method", s.name), y: .value("Accounts", s.value), width: .ratio(0.7))
                .clipShape(.rect(cornerRadius: 10))
                .foregroundStyle(s.value == top ? AnyShapeStyle(LinearGradient(colors: [Color(red: 0.32, green: 0.62, blue: 1), .snowBlue], startPoint: .top, endPoint: .bottom)) : AnyShapeStyle(Color(.systemFill)))
                .annotation(position: .top) {
                    Text("\(s.value)").font(.caption2.weight(.semibold))
                        .padding(.horizontal, 6).padding(.vertical, 3)
                        .foregroundStyle(s.value == top ? .white : .secondary)
                        .background(s.value == top ? Color.snowInk : .clear, in: .capsule)
                }
        }
        .chartYAxis(.hidden)
        .frame(height: 170)
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do { data = try await API(session: session).get("/api/admin/monitor", query: ["view": "overview"]); error = nil }
        catch { self.error = error.localizedDescription }
    }
}
