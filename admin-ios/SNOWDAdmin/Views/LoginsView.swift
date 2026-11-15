import SwiftUI

struct LoginsView: View {
    @Environment(Session.self) private var session
    @State private var items: [Login] = []
    @State private var loading = true
    @State private var error: String?
    @State private var search = ""
    @State private var range = Range.week

    enum Range: String, CaseIterable { case day = "24h", week = "7 days", month = "30 days", all = "All"
        var seconds: Double { switch self { case .day: 86_400; case .week: 604_800; case .month: 2_592_000; case .all: .infinity } }
    }

    private var visible: [Login] {
        let now = Date().timeIntervalSince1970 * 1000
        let q = search.lowercased()
        return items.filter { l in
            (now - (l.lastSignIn ?? 0)) / 1000 < range.seconds &&
            (q.isEmpty || [l.name, l.email, l.phone, l.provider, l.role, l.id].compactMap { $0 }.joined(separator: " ").lowercased().contains(q))
        }
    }

    var body: some View {
        NavigationStack {
            ScreenState(loading: loading, error: error, empty: items.isEmpty, emptyTitle: "No sign-ins yet", emptySymbol: "person.badge.key", retry: load) {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        Picker("Range", selection: $range) { ForEach(Range.allCases, id: \.self) { Text($0.rawValue) } }
                            .pickerStyle(.segmented)
                        Text("\(visible.count) account\(visible.count == 1 ? "" : "s") signed in · \(range == .all ? "all time" : "last \(range.rawValue)")")
                            .font(.footnote).foregroundStyle(.secondary).frame(maxWidth: .infinity, alignment: .leading)
                        if visible.isEmpty { ContentUnavailableView.search(text: search).padding(.top, 40) }
                        ForEach(visible) { login in
                            NavigationLink(value: login.id) { LoginCard(login: login) }.buttonStyle(.plain)
                        }
                    }
                    .padding(16)
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Logins")
            .searchable(text: $search, prompt: "Name, email or method")
            .navigationDestination(for: String.self) { AccountDetailView(uid: $0) }
            .refreshable { await load() }
            .task { if items.isEmpty { await load() } }
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do { items = try await (API(session: session).get("/api/admin/monitor", query: ["view": "logins"]) as Logins).items; error = nil }
        catch { self.error = error.localizedDescription }
    }
}

struct LoginCard: View {
    let login: Login
    var body: some View {
        Card {
            HStack {
                Text(login.name).font(.headline).lineLimit(1)
                Spacer()
                Pill(label: login.disabled ? "Suspended" : status)
            }
            .padding(.bottom, 6)
            InfoRow(label: "Account") { HStack(spacing: 6) { Avatar(name: login.name, size: 20); Text(login.email ?? login.phone ?? "—") } }
            InfoRow("Method", login.provider)
            InfoRow("Role", Fmt.title(login.role ?? "No profile"))
            InfoRow("Signed in", Fmt.ago(ms: login.lastSignIn), last: true)
        }
    }
    private var status: String {
        guard let last = login.lastSignIn else { return "Never" }
        return Date().timeIntervalSince1970 - last / 1000 < 86_400 ? "Today" : "Active"
    }
}

/// Full account record from the admin console with every account action.
struct AccountDetailView: View {
    let uid: String
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var record: Record?
    @State private var loadError: String?
    @State private var draft: [String: String] = [:]
    @State private var runner = ActionRunner()
    @State private var confirm: Confirm?
    @State private var supportChat: String?

    struct Confirm: Identifiable { let id = UUID(); let title, message: String; let destructive: Bool; let action: () -> Void }

    var body: some View {
        Form {
            if let error = runner.error ?? loadError { Section { Banner(text: error) } }
            if let success = runner.success { Section { Banner(text: success, tone: .green) } }
            if let r = record {
                Section {
                    VStack(spacing: 8) {
                        Avatar(name: r.text("displayName") ?? r.text("email") ?? "?", size: 84)
                        Text(r.text("displayName") ?? "Unnamed account").font(.title3.bold())
                        HStack { Pill(label: r["disabled"]?.bool == true ? "Suspended" : r.text("role") ?? "No role"); if let v = r.text("verificationStatus") { Pill(label: v) } }
                    }
                    .frame(maxWidth: .infinity).listRowBackground(Color.clear)
                }
                Section("Details") {
                    TextField("Name", text: binding("displayName"))
                    TextField("Email", text: binding("email")).keyboardType(.emailAddress).textInputAutocapitalization(.never)
                    TextField("Phone", text: binding("phone")).keyboardType(.phonePad)
                    Picker("Role", selection: binding("role")) {
                        ForEach(["client", "operator", "employee", "admin"], id: \.self) { Text(Fmt.title($0)).tag($0) }
                    }
                    TextField("About", text: binding("bio"), axis: .vertical).lineLimit(2...5)
                    Button("Save changes") {
                        let changes = ["displayName", "email", "phone", "bio", "role"].reduce(into: [String: String]()) { out, key in
                            if (draft[key] ?? "") != (r.text(key) ?? (key == "role" ? "client" : "")) { out[key] = draft[key] ?? "" }
                        }
                        guard !changes.isEmpty else { runner.success = "Nothing changed."; return }
                        let roleChange = changes["role"] != nil
                        let save = { Task { await act { _ = try await api.run("/api/admin/users/\(uid)", method: "PATCH", body: changes); return "Account saved." } } }
                        if roleChange { confirm = .init(title: "Change role", message: "This signs the person out of every device.", destructive: false) { _ = save() } } else { _ = save() }
                    }
                    .disabled(runner.busy)
                }
                Section("Record") {
                    LabeledContent("User ID") { Text(uid).font(.caption.monospaced()).textSelection(.enabled) }
                    LabeledContent("Joined", value: r["createdAt"]?.date.map { $0.formatted(date: .abbreviated, time: .omitted) } ?? "—")
                    LabeledContent("Last seen", value: Fmt.ago(r["lastSeen"]?.date))
                    LabeledContent("Onboarding", value: r["onboardingComplete"]?.bool == true ? "Complete" : "Not finished")
                    if let city = r.text("city") { LabeledContent("City", value: city) }
                    if r.text("stripeAccountId") != nil { LabeledContent("Payouts", value: r["stripeOnboardingComplete"]?.bool == true ? "Stripe connected" : "Stripe set up started") }
                }
                Section {
                    Button("Message as SNOWD Support", systemImage: "bubble.left.and.text.bubble.right") {
                        Task { await act {
                            let res = try await api.run("/api/admin/console", body: ["action": "support-open", "id": uid, "requestId": requestID()])
                            supportChat = res["id"]?.string
                            return nil
                        } }
                    }
                    let disabled = r["disabled"]?.bool == true
                    Button(disabled ? "Enable account" : "Suspend account", systemImage: disabled ? "person.crop.circle.badge.checkmark" : "person.crop.circle.badge.xmark") {
                        confirm = .init(title: disabled ? "Enable account" : "Suspend account", message: disabled ? "They'll be able to sign in again." : "They'll be signed out everywhere and can't sign in.", destructive: !disabled) {
                            Task { await act { _ = try await api.run("/api/admin/users/\(uid)", method: "PATCH", body: ["disabled": !disabled]); return disabled ? "Account enabled." : "Account suspended." } }
                        }
                    }
                    Button("Delete account", systemImage: "trash", role: .destructive) {
                        confirm = .init(title: "Delete account", message: "Permanently deletes this login and profile. Job and payment history is kept.", destructive: true) {
                            Task { await act { _ = try await api.run("/api/admin/users/\(uid)", method: "DELETE"); dismiss(); return "Deleted." } }
                        }
                    }
                }
                .disabled(runner.busy)
            } else if loadError == nil {
                ProgressView().frame(maxWidth: .infinity)
            }
        }
        .navigationTitle("User information")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(item: $supportChat) { SupportDetailView(id: $0) }
        .toolbar { ToolbarItem(placement: .topBarTrailing) { if runner.busy { ProgressView() } } }
        .alert(confirm?.title ?? "", isPresented: Binding(get: { confirm != nil }, set: { if !$0 { confirm = nil } }), presenting: confirm) { c in
            Button(c.title, role: c.destructive ? .destructive : nil) { c.action() }
            Button("Cancel", role: .cancel) {}
        } message: { Text($0.message) }
        .refreshable { await load() }
        .task { if record == nil { await load() } }
    }

    private var api: API { API(session: session) }
    private func binding(_ key: String) -> Binding<String> { Binding(get: { draft[key] ?? "" }, set: { draft[key] = $0 }) }
    private func act(_ work: @escaping () async throws -> String?) async {
        await runner.run(work)
        if runner.error == nil { await load() }
    }
    private func load() async {
        do {
            let page: Page = try await api.get("/api/admin/console", query: ["section": "accounts", "id": uid])
            record = page.item
            draft = Dictionary(uniqueKeysWithValues: ["displayName", "email", "phone", "bio", "role"].map { ($0, page.item?.text($0) ?? "") })
            if draft["role"]?.isEmpty ?? true { draft["role"] = "client" }
            loadError = nil
        } catch { loadError = error.localizedDescription }
    }
}
