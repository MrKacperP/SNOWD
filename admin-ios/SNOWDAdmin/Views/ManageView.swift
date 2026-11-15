import SwiftUI

struct ManageView: View {
    @Environment(Session.self) private var session
    @AppStorage("faceIDLock") private var lockEnabled = true
    @State private var confirmSignOut = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 14) {
                        Image("Penguin").resizable().frame(width: 52, height: 52).clipShape(.rect(cornerRadius: 13))
                        VStack(alignment: .leading) {
                            Text(session.name ?? "SNOWD owner").font(.headline)
                            Text(session.email ?? "").font(.subheadline).foregroundStyle(.secondary)
                        }
                    }
                }
                Section("Records") {
                    NavigationLink { ConsoleList(section: .accounts) } label: { Label("Accounts", systemImage: "person.2.fill") }
                    NavigationLink { ConsoleList(section: .jobs) } label: { Label("Work orders", systemImage: "list.clipboard.fill") }
                    NavigationLink { ConsoleList(section: .support) } label: { Label("Support chats", systemImage: "bubble.left.and.bubble.right.fill") }
                    NavigationLink { ConsoleList(section: .activity) } label: { Label("Admin activity", systemImage: "clock.arrow.circlepath") }
                }
                Section("Settings") {
                    NavigationLink { PricingView() } label: { Label("Fees & discounts", systemImage: "tag.fill") }
                    Toggle(isOn: $lockEnabled) { Label("Lock with Face ID", systemImage: "faceid") }
                    Link(destination: Config.webAdmin) { Label("Open web admin", systemImage: "safari") }
                }
                Section {
                    Button("Sign out", role: .destructive) { confirmSignOut = true }
                } footer: {
                    Text("SNOWD Admin \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "") (\(Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? ""))")
                }
            }
            .navigationTitle("Manage")
            .confirmationDialog("Sign out of SNOWD Admin?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button("Sign out", role: .destructive) { session.signOut() }
            }
        }
    }
}

enum ConsoleSection: String {
    case accounts, jobs, support, activity
    var title: String { switch self { case .accounts: "Accounts"; case .jobs: "Work orders"; case .support: "Support chats"; case .activity: "Admin activity" } }
}

/// Paged list from /api/admin/console for one collection.
struct ConsoleList: View {
    let section: ConsoleSection
    @Environment(Session.self) private var session
    @State private var items: [Record] = []
    @State private var next: String?
    @State private var loading = true
    @State private var error: String?
    @State private var search = ""
    @State private var creating = false

    private var visible: [Record] {
        let q = search.lowercased()
        let filtered = q.isEmpty ? items : items.filter { r in
            ["id", "displayName", "email", "orderNumber", "status", "address", "userName", "subject", "description", "role"].compactMap { r.text($0) }.joined(separator: " ").lowercased().contains(q)
        }
        return filtered.sorted { ($0["updatedAt"]?.date ?? $0["createdAt"]?.date ?? .distantPast) > ($1["updatedAt"]?.date ?? $1["createdAt"]?.date ?? .distantPast) }
    }

    var body: some View {
        ScreenState(loading: loading, error: error, empty: items.isEmpty, emptyTitle: "Nothing here yet", emptySymbol: "tray", retry: { await load() }) {
            List {
                ForEach(visible, id: \.id) { r in
                    NavigationLink { destination(r) } label: { row(r) }
                }
                if let next {
                    Button("Load more") { Task { await load(after: next) } }
                }
            }
        }
        .navigationTitle(section.title)
        .searchable(text: $search)
        .refreshable { await load() }
        .task { if items.isEmpty { await load() } }
        .toolbar {
            if section == .accounts {
                ToolbarItem(placement: .topBarTrailing) { Button("New account", systemImage: "plus") { creating = true } }
            }
        }
        .sheet(isPresented: $creating) { CreateAccountView { Task { await load() } } }
    }

    @ViewBuilder private func destination(_ r: Record) -> some View {
        switch section {
        case .accounts: AccountDetailView(uid: r.id)
        case .jobs: JobDetailView(id: r.id)
        case .support: SupportDetailView(id: r.id)
        case .activity: ActivityDetail(record: r)
        }
    }

    @ViewBuilder private func row(_ r: Record) -> some View {
        switch section {
        case .accounts:
            HStack(spacing: 12) {
                Avatar(name: r.text("displayName") ?? r.text("email") ?? "?", size: 34)
                VStack(alignment: .leading) {
                    Text(r.text("displayName") ?? "Unnamed").font(.body.weight(.medium))
                    Text(r.text("email") ?? r.text("phone") ?? r.id).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                Pill(label: r["disabled"]?.bool == true ? "Suspended" : r.text("role") ?? "—")
            }
        case .jobs:
            VStack(alignment: .leading, spacing: 4) {
                HStack { Text(r.text("orderNumber").map { "#\($0)" } ?? Fmt.short(r.id)).font(.body.weight(.semibold)); Spacer(); Pill(label: r.text("status") ?? "pending") }
                Text(r.text("address") ?? "No address").font(.subheadline).foregroundStyle(.secondary)
                Text("\(Fmt.dollars(r["price"]?.number)) · \(Fmt.title(r.text("paymentStatus")))").font(.caption).foregroundStyle(.secondary)
            }
        case .support:
            VStack(alignment: .leading, spacing: 4) {
                HStack { Text(r.text("userName") ?? "Customer").font(.body.weight(.semibold)); Spacer(); Pill(label: r.text("status") ?? "open") }
                Text(r.text("lastMessage") ?? r.text("subject") ?? "").font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
            }
        case .activity:
            VStack(alignment: .leading, spacing: 4) {
                Text("\(r.text("userName") ?? "Admin") \(r.text("description") ?? "")").font(.subheadline).lineLimit(2)
                Text("\(r.text("type") ?? "") · \(Fmt.ago(r["createdAt"]?.date))").font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    private func load(after: String? = nil) async {
        loading = true
        defer { loading = false }
        do {
            let page: Page = try await API(session: session).get("/api/admin/console", query: ["section": section.rawValue, "after": after])
            items = after == nil ? (page.items ?? []) : items + (page.items ?? [])
            next = page.next
            error = nil
        } catch { self.error = error.localizedDescription }
    }
}

struct ActivityDetail: View {
    let record: Record
    var body: some View {
        Form {
            LabeledContent("What", value: record.text("description") ?? "—")
            LabeledContent("Type", value: record.text("type") ?? "—")
            LabeledContent("By", value: record.text("userName") ?? record.text("actorUid") ?? "—")
            LabeledContent("When", value: record["createdAt"]?.date?.formatted(date: .abbreviated, time: .standard) ?? "—")
            if let target = record.text("targetId") { LabeledContent("Record") { Text(target).font(.caption.monospaced()).textSelection(.enabled) } }
            if let changes = record["changes"], changes != .null { LabeledContent("Changes") { Text(describe(changes)).font(.caption) } }
        }
        .navigationTitle("Activity")
        .navigationBarTitleDisplayMode(.inline)
    }
    private func describe(_ v: JSONValue) -> String {
        if case .object(let o) = v { return o.sorted { $0.key < $1.key }.map { "\($0.key): \($0.value.string ?? "…")" }.joined(separator: "\n") }
        return v.string ?? "—"
    }
}

struct SupportDetailView: View {
    let id: String
    @Environment(Session.self) private var session
    @State private var chat: Record?
    @State private var messages: [Record] = []
    @State private var reply = ""
    @State private var error: String?
    @State private var runner = ActionRunner()

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 10) {
                    if let e = runner.error ?? error { Banner(text: e) }
                    if let chat {
                        HStack { Text(chat.text("subject") ?? "Support"); Spacer(); Pill(label: chat.text("status") ?? "open") }
                            .font(.subheadline).foregroundStyle(.secondary)
                    }
                    if messages.isEmpty && chat != nil { Text("No messages yet.").foregroundStyle(.secondary).padding(.top, 30) }
                    ForEach(messages, id: \.id) { m in bubble(m).id(m.id) }
                }
                .padding(16)
            }
            .defaultScrollAnchor(.bottom)
            .onChange(of: messages.count) { if let last = messages.last { proxy.scrollTo(last.id, anchor: .bottom) } }
        }
        .safeAreaInset(edge: .bottom) {
            HStack(alignment: .bottom, spacing: 8) {
                TextField("Reply as SNOWD Support", text: $reply, axis: .vertical).lineLimit(1...5)
                    .padding(.horizontal, 14).padding(.vertical, 10)
                    .glassEffect(.regular, in: .rect(cornerRadius: 20))
                Button { send() } label: { Image(systemName: "arrow.up").fontWeight(.bold).frame(width: 30, height: 30) }
                    .buttonStyle(.glassProminent).buttonBorderShape(.circle)
                    .disabled(reply.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || runner.busy)
                    .accessibilityLabel("Send")
            }
            .padding(.horizontal, 12).padding(.bottom, 8)
        }
        .navigationTitle(chat?.text("userName") ?? "Support")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                let resolved = chat?.text("status") == "resolved"
                Button(resolved ? "Reopen" : "Resolve") {
                    Task { await runner.run { _ = try await API(session: session).run("/api/admin/console", body: ["action": "support-status", "id": id, "status": resolved ? "open" : "resolved", "requestId": requestID()]); return nil }; await load() }
                }
                .disabled(chat == nil || runner.busy)
            }
        }
        .refreshable { await load() }
        .task { await load() }
    }

    private func bubble(_ m: Record) -> some View {
        let mine = m.text("senderId") == "SNOWD_ADMIN"
        return VStack(alignment: mine ? .trailing : .leading, spacing: 3) {
            Text(m.text("content") ?? "").textSelection(.enabled)
                .padding(.horizontal, 13).padding(.vertical, 9)
                .foregroundStyle(mine ? .white : .primary)
                .background(mine ? Color.snowBlue : Color(.secondarySystemBackground), in: .rect(cornerRadius: 18))
            Text("\(mine ? "SNOWD Support" : m.text("senderName") ?? "Customer") · \(Fmt.ago(m["createdAt"]?.date))").font(.caption2).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: mine ? .trailing : .leading)
    }

    private func send() {
        let text = reply.trimmingCharacters(in: .whitespacesAndNewlines)
        Task {
            await runner.run { _ = try await API(session: session).run("/api/admin/console", body: ["action": "support-reply", "id": id, "message": text, "requestId": requestID()]); return nil }
            if runner.error == nil { reply = "" ; await load() }
        }
    }

    private func load() async {
        do {
            let page: Page = try await API(session: session).get("/api/admin/console", query: ["section": "support", "id": id])
            chat = page.item; messages = page.messages ?? []; error = nil
        } catch { self.error = error.localizedDescription }
    }
}

struct CreateAccountView: View {
    let created: () -> Void
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var role = "client"
    @State private var runner = ActionRunner()
    @State private var attempt = requestID()

    var body: some View {
        NavigationStack {
            Form {
                if let e = runner.error { Banner(text: e) }
                TextField("Full name", text: $name)
                TextField("Email", text: $email).keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                Picker("Type", selection: $role) { Text("Customer").tag("client"); Text("Operator").tag("operator") }.pickerStyle(.segmented)
                Section { } footer: { Text("They set their password with Forgot password on snowd.ca, then finish onboarding. No email is sent.") }
            }
            .navigationTitle("New account")
            .navigationBarTitleDisplayMode(.inline)
            .onChange(of: [name, email, role]) { attempt = requestID() }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel", systemImage: "xmark") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create", systemImage: "checkmark") {
                        Task {
                            await runner.run { _ = try await API(session: session).run("/api/admin/console", body: ["action": "create-account", "displayName": name, "email": email, "role": role, "requestId": attempt]); return nil }
                            if runner.error == nil { created(); dismiss() }
                        }
                    }
                    .buttonStyle(.glassProminent)
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || !email.contains("@") || runner.busy)
                }
            }
        }
    }
}

struct PricingView: View {
    @Environment(Session.self) private var session
    @State private var policy: Record?
    @State private var commission = ""
    @State private var fee = ""
    @State private var discount = ""
    @State private var error: String?
    @State private var runner = ActionRunner()
    @State private var confirm = false

    var body: some View {
        Form {
            if let e = runner.error ?? error { Banner(text: e) }
            if let s = runner.success { Banner(text: s, tone: .green) }
            Section {
                LabeledContent("Commission (%)") { TextField("0", text: $commission).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                LabeledContent("Transaction fee (CAD)") { TextField("0.00", text: $fee).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                LabeledContent("Discount on fees (%)") { TextField("0", text: $discount).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
            } footer: {
                Text("Applies to new card bookings. Cash prices and existing orders stay the same. Discounts reduce SNOWD's fee; operators keep their quoted amount.")
            }
            Button("Save pricing") { confirm = true }
                .disabled(policy == nil || runner.busy || [commission, fee, discount].contains { Double($0) == nil })
        }
        .navigationTitle("Fees & discounts")
        .alert("Save pricing", isPresented: $confirm) {
            Button("Save") { save() }
            Button("Cancel", role: .cancel) {}
        } message: { Text("These fees apply to future card bookings across SNOWD.") }
        .task { await load() }
    }

    private func save() {
        guard let policy else { return }
        Task {
            await runner.run {
                func num(_ v: Double) -> String { v == v.rounded() ? String(Int(v)) : String(v) }
                let old = { (key: String) in num(policy[key]?.number ?? 0) }
                let json = """
                {"action":"pricing","requestId":"\(requestID())",\
                "previous":{"commissionPercent":\(old("commissionPercent")),"transactionFeeCents":\(old("transactionFeeCents")),"discountPercent":\(old("discountPercent"))},\
                "policy":{"commissionPercent":\(num(Double(commission) ?? 0)),"transactionFeeCents":\(Int(((Double(fee) ?? 0) * 100).rounded())),"discountPercent":\(num(Double(discount) ?? 0))}}
                """
                _ = try await API(session: session).run("/api/admin/console", json: json)
                return "Pricing saved."
            }
            await load()
        }
    }

    private func load() async {
        do {
            let page: Page = try await API(session: session).get("/api/admin/console", query: ["section": "pricing"])
            policy = page.policy
            commission = page.policy?["commissionPercent"]?.string ?? ""
            fee = String(format: "%.2f", (page.policy?["transactionFeeCents"]?.number ?? 0) / 100)
            discount = page.policy?["discountPercent"]?.string ?? ""
            error = nil
        } catch { self.error = error.localizedDescription }
    }
}
