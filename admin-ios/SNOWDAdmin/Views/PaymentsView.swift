import SwiftUI

struct PaymentsView: View {
    @Environment(Session.self) private var session
    @State private var items: [Payment] = []
    @State private var next: Double?
    @State private var loading = true
    @State private var error: String?
    @State private var filter = "All"
    @State private var search = ""
    private let filters = ["All", "Paid", "Held", "Refunded", "Pending"]

    private var visible: [Payment] {
        let q = search.lowercased()
        return items.filter { p in
            (filter == "All" || p.status.lowercased() == filter.lowercased()) &&
            (q.isEmpty || [p.id, p.clientName, p.operatorName, p.address, p.description, p.jobId].compactMap { $0 }.joined(separator: " ").lowercased().contains(q))
        }
    }

    var body: some View {
        NavigationStack {
            ScreenState(loading: loading, error: error, empty: items.isEmpty, emptyTitle: "No payments yet", emptySymbol: "creditcard", retry: { await load() }) {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(filters, id: \.self) { f in
                                    Button(f) { withAnimation(.snappy) { filter = f } }
                                        .buttonStyle(.glass)
                                        .tint(filter == f ? Color.snowBlue : nil)
                                        .fontWeight(filter == f ? .semibold : .regular)
                                }
                            }
                        }
                        .scrollClipDisabled()
                        summary
                        ForEach(visible) { p in
                            NavigationLink(value: p) { PaymentCard(payment: p) }.buttonStyle(.plain)
                        }
                        if let next {
                            Button("Load older payments") { Task { await load(before: next) } }.buttonStyle(.glass).padding(.top, 4)
                        }
                    }
                    .padding(16)
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Payments")
            .searchable(text: $search, prompt: "Customer, operator or address")
            .navigationDestination(for: Payment.self) { PaymentDetailView(payment: $0) }
            .refreshable { await load() }
            .task { if items.isEmpty { await load() } }
        }
    }

    private var summary: some View {
        let paid = visible.filter { $0.status == "paid" }
        return HStack(spacing: 12) {
            StatTile(title: "Collected", value: Fmt.money(paid.reduce(0) { $0 + $1.amount }), detail: "\(paid.count) paid", symbol: "arrow.down.left")
            StatTile(title: "On hold", value: Fmt.money(visible.filter { $0.status == "held" }.reduce(0) { $0 + $1.amount }), detail: "cards", symbol: "hourglass", dark: true)
        }
    }

    private func load(before: Double? = nil) async {
        loading = true
        defer { loading = false }
        do {
            let page: Payments = try await API(session: session).get("/api/admin/monitor", query: ["view": "payments", "before": before.map { String(Int($0)) }])
            items = before == nil ? page.items : items + page.items
            next = page.next
            error = nil
        } catch { self.error = error.localizedDescription }
    }
}

struct PaymentCard: View {
    let payment: Payment
    var body: some View {
        Card {
            HStack {
                Text(Fmt.short(payment.jobId ?? payment.id)).font(.headline)
                Spacer()
                Pill(label: payment.status)
            }
            .padding(.bottom, 6)
            InfoRow(label: "Customer") { HStack(spacing: 6) { Avatar(name: payment.clientName ?? "?", size: 20); Text(payment.clientName ?? "Unknown") } }
            InfoRow("Amount", "\(Fmt.money(payment.amount)) · \(Fmt.title(payment.method))")
            InfoRow("Address", payment.address)
            InfoRow("Date", Fmt.ago(ms: payment.createdAt), last: true)
        }
    }
}

struct PaymentDetailView: View {
    let payment: Payment
    var body: some View {
        Form {
            Section {
                VStack(spacing: 6) {
                    Text(Fmt.money(payment.amount)).font(.system(size: 40, weight: .bold)).monospacedDigit()
                    HStack { Pill(label: payment.status); Pill(label: payment.method) }
                }
                .frame(maxWidth: .infinity).listRowBackground(Color.clear)
            }
            Section("Payment") {
                LabeledContent("Operator share", value: payment.operatorAmount.map(Fmt.money) ?? "—")
                if let fee = payment.platformFee { LabeledContent("SNOWD fee", value: Fmt.money(fee)) }
                LabeledContent("Created", value: Fmt.day(ms: payment.createdAt))
                if let updated = payment.updatedAt { LabeledContent("Updated", value: Fmt.day(ms: updated)) }
                if let description = payment.description { Text(description).font(.footnote).foregroundStyle(.secondary) }
                if let pi = payment.stripePaymentIntentId { LabeledContent("Stripe") { Text(pi).font(.caption.monospaced()).textSelection(.enabled) } }
            }
            Section("People") {
                if let id = payment.clientId { NavigationLink { AccountDetailView(uid: id) } label: { LabeledContent("Customer", value: payment.clientName ?? id) } }
                if let id = payment.operatorId { NavigationLink { AccountDetailView(uid: id) } label: { LabeledContent("Operator", value: payment.operatorName ?? id) } }
            }
            if let job = payment.jobId {
                Section { NavigationLink("Manage order, capture or refund") { JobDetailView(id: job) } }
            }
        }
        .navigationTitle(Fmt.short(payment.jobId ?? payment.id))
        .navigationBarTitleDisplayMode(.inline)
    }
}

/// A work order with every admin action the server allows for its state.
struct JobDetailView: View {
    let id: String
    @Environment(Session.self) private var session
    @State private var record: Record?
    @State private var loadError: String?
    @State private var notes = ""
    @State private var instructions = ""
    @State private var runner = ActionRunner()
    @State private var confirm: AccountDetailView.Confirm?

    var body: some View {
        Form {
            if let error = runner.error ?? loadError { Section { Banner(text: error) } }
            if let success = runner.success { Section { Banner(text: success, tone: .green) } }
            if let r = record {
                let status = r.text("status") ?? "pending", payment = r.text("paymentStatus") ?? "pending"
                Section {
                    InfoRow(label: "Status") { Pill(label: r["adminFlagged"]?.bool == true ? "Flagged" : status) }
                    InfoRow("Order", r.text("orderNumber").map { "#\($0)" } ?? Fmt.short(id))
                    InfoRow("Address", [r.text("address"), r.text("city")].compactMap { $0 }.joined(separator: ", "))
                    InfoRow("Price", Fmt.dollars(r["price"]?.number))
                    InfoRow("Payment", "\(Fmt.title(r.text("paymentMethod"))) · \(Fmt.title(payment))")
                    InfoRow("Created", r["createdAt"]?.date?.formatted(date: .abbreviated, time: .shortened), last: true)
                }
                Section("People") {
                    if let c = r.text("clientId") { NavigationLink { AccountDetailView(uid: c) } label: { LabeledContent("Customer", value: r.text("clientName") ?? c) } }
                    if let o = r.text("operatorId") { NavigationLink { AccountDetailView(uid: o) } label: { LabeledContent("Operator", value: r.text("operatorName") ?? o) } }
                }
                Section("Work order") {
                    TextField("Service instructions", text: $instructions, axis: .vertical).lineLimit(2...6)
                    TextField("Work order notes", text: $notes, axis: .vertical).lineLimit(2...6)
                    Button("Save notes") { perform(nil) { _ = try await api.run("/api/admin/jobs/\(id)", method: "PATCH", body: ["specialInstructions": instructions, "operatorNotes": notes]); return "Work order saved." } }
                    Toggle("Flag for review", isOn: Binding(get: { r["adminFlagged"]?.bool == true }, set: { v in
                        perform(nil) { _ = try await api.run("/api/admin/jobs/\(id)", method: "PATCH", body: ["adminFlagged": v]); return v ? "Flagged." : "Flag cleared." }
                    }))
                }
                Section("Actions") {
                    if status == "pending" {
                        Button("Approve job", systemImage: "checkmark.circle") {
                            perform(.init(title: "Approve job", message: "Accept this request for the assigned operator.", destructive: false, action: {})) {
                                _ = try await api.run("/api/jobs/action", body: ["jobId": id, "action": "accept", "revision": r["revision"]?.number ?? 0, "requestId": requestID()]); return "Job approved."
                            }
                        }
                    }
                    if let pi = r.text("stripePaymentIntentId") {
                        if payment == "held" {
                            Button("Capture card payment", systemImage: "creditcard") {
                                perform(.init(title: "Capture payment", message: "Charge the held amount. A completion photo is required.", destructive: false, action: {})) {
                                    _ = try await api.run("/api/stripe/capture-payment", body: ["paymentIntentId": pi]); return "Payment captured."
                                }
                            }
                        }
                        if payment == "paid" {
                            Button("Refund card payment", systemImage: "arrow.uturn.backward", role: .destructive) {
                                perform(.init(title: "Refund payment", message: "Refunds the full card payment including fees and reverses the operator transfer.", destructive: true, action: {})) {
                                    let res = try await api.run("/api/admin/refund", body: ["jobId": id]); return res["warning"]?.string ?? res["message"]?.string
                                }
                            }
                        }
                    }
                    if !["completed", "cancelled"].contains(status) {
                        Button("Cancel job", systemImage: "xmark.circle", role: .destructive) {
                            perform(.init(title: "Cancel job", message: "Stops this service and releases any card hold. Captured payments need a separate refund.", destructive: true, action: {})) {
                                _ = try await api.run("/api/jobs/cancel", body: ["jobId": id]); return "Job cancelled."
                            }
                        }
                    } else if status == "cancelled" && r.text("stripePaymentIntentId") != nil && !["paid", "refunded"].contains(payment) {
                        Button("Retry releasing card hold") { perform(nil) { _ = try await api.run("/api/jobs/cancel", body: ["jobId": id]); return "Hold released." } }
                    }
                }
                .disabled(runner.busy)
            } else if loadError == nil { ProgressView().frame(maxWidth: .infinity) }
        }
        .navigationTitle("Work order")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .topBarTrailing) { if runner.busy { ProgressView() } } }
        .alert(confirm?.title ?? "", isPresented: Binding(get: { confirm != nil }, set: { if !$0 { confirm = nil } }), presenting: confirm) { c in
            Button(c.title, role: c.destructive ? .destructive : nil) { c.action() }
            Button("Cancel", role: .cancel) {}
        } message: { Text($0.message) }
        .refreshable { await load() }
        .task { if record == nil { await load() } }
    }

    private var api: API { API(session: session) }
    /// Runs immediately, or after the confirmation alert when one is given.
    private func perform(_ ask: AccountDetailView.Confirm?, _ work: @escaping () async throws -> String?) {
        let go = { Task { await runner.run(work); if runner.error == nil { await load() } } }
        if let ask { confirm = .init(title: ask.title, message: ask.message, destructive: ask.destructive) { _ = go() } } else { _ = go() }
    }
    private func load() async {
        do {
            let page: Page = try await api.get("/api/admin/console", query: ["section": "jobs", "id": id])
            record = page.item
            notes = page.item?.text("operatorNotes") ?? ""
            instructions = page.item?.text("specialInstructions") ?? ""
            loadError = nil
        } catch { loadError = error.localizedDescription }
    }
}
