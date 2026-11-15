import SwiftUI

struct VerifyView: View {
    @Environment(Session.self) private var session
    @State private var data: Verifications?
    @State private var loading = true
    @State private var error: String?
    @State private var showReviewed = false

    var body: some View {
        NavigationStack {
            ScreenState(loading: loading, error: error, empty: data == nil, emptyTitle: "", emptySymbol: "", retry: load) {
                if let data {
                    let list = showReviewed ? data.reviewed : data.pending
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            Picker("Show", selection: $showReviewed) {
                                Text("Waiting (\(data.pending.count))").tag(false)
                                Text("Reviewed (\(data.reviewed.count))").tag(true)
                            }
                            .pickerStyle(.segmented)
                            if list.isEmpty {
                                ContentUnavailableView(showReviewed ? "No reviews yet" : "All caught up", systemImage: "checkmark.shield",
                                                       description: Text(showReviewed ? "Approved and rejected IDs show here." : "No IDs are waiting for review."))
                                    .padding(.top, 40)
                            }
                            ForEach(list) { v in
                                NavigationLink(value: v) { VerificationCard(item: v) }.buttonStyle(.plain)
                            }
                        }
                        .padding(16)
                    }
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Verify")
            .navigationDestination(for: Verification.self) { VerificationDetailView(item: $0) { Task { await load() } } }
            .refreshable { await load() }
            .task { await load() }
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do { data = try await API(session: session).get("/api/admin/monitor", query: ["view": "verifications"]); error = nil }
        catch { self.error = error.localizedDescription }
    }
}

struct VerificationCard: View {
    let item: Verification
    var body: some View {
        Card {
            HStack {
                Avatar(name: item.name, size: 30)
                Text(item.name).font(.headline).lineLimit(1)
                Spacer()
                Pill(label: item.status ?? "pending")
            }
            .padding(.bottom, 6)
            InfoRow("Email", item.email)
            InfoRow("Role", Fmt.title(item.role))
            InfoRow(item.status == "pending" ? "Submitted" : "Reviewed", Fmt.ago(ms: item.status == "pending" ? item.submittedAt : item.reviewedAt), last: true)
        }
    }
}

struct VerificationDetailView: View {
    let item: Verification
    let changed: () -> Void
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var note = ""
    @State private var runner = ActionRunner()
    @State private var confirmApprove = false
    @State private var confirmReject = false
    @State private var zoom = false

    var body: some View {
        Form {
            if let error = runner.error { Section { Banner(text: error) } }
            Section {
                if let url = item.idPhotoUrl.flatMap(URL.init(string:)) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image): image.resizable().scaledToFit().onTapGesture { zoom = true }
                        case .failure: Link("Open submitted document", destination: url)
                        default: ProgressView().frame(maxWidth: .infinity, minHeight: 200)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .listRowInsets(EdgeInsets())
                    .accessibilityLabel("Submitted identity document")
                } else {
                    Text("No document was uploaded.").foregroundStyle(.secondary)
                }
            } footer: { if item.idPhotoUrl != nil { Text("Tap the photo to view it full screen.") } }
            Section("Person") {
                LabeledContent("Name", value: item.name)
                LabeledContent("Email", value: item.email ?? "—")
                if let phone = item.phone { LabeledContent("Phone", value: phone) }
                LabeledContent("Role", value: Fmt.title(item.role))
                LabeledContent("Joined", value: Fmt.day(ms: item.createdAt))
                NavigationLink("Open full account") { AccountDetailView(uid: item.id) }
            }
            if item.status == "pending" {
                Section {
                    Button("Approve", systemImage: "checkmark.seal.fill") { confirmApprove = true }
                        .buttonStyle(.glassProminent).tint(.green).frame(maxWidth: .infinity)
                        .listRowBackground(Color.clear)
                }
                Section("Reject") {
                    TextField("Reason the person will see", text: $note, axis: .vertical).lineLimit(2...5)
                    Button("Reject verification", role: .destructive) { confirmReject = true }
                        .disabled(note.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .disabled(runner.busy)
            } else {
                Section("Review") {
                    LabeledContent("Decision", value: Fmt.title(item.status))
                    LabeledContent("When", value: Fmt.day(ms: item.reviewedAt))
                    if let by = item.reviewedBy { LabeledContent("By", value: by) }
                    if let note = item.note, !note.isEmpty { Text(note).foregroundStyle(.secondary) }
                }
            }
        }
        .navigationTitle(item.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .topBarTrailing) { if runner.busy { ProgressView() } } }
        .alert("Approve verification", isPresented: $confirmApprove) {
            Button("Approve") { decide("approved") }
            Button("Cancel", role: .cancel) {}
        } message: { Text("Confirm you checked the document matches \(item.name).") }
        .alert("Reject verification", isPresented: $confirmReject) {
            Button("Reject", role: .destructive) { decide("rejected") }
            Button("Cancel", role: .cancel) {}
        } message: { Text("They'll see your reason and can upload a new document.") }
        .fullScreenCover(isPresented: $zoom) {
            ZStack(alignment: .topTrailing) {
                Color.black.ignoresSafeArea()
                AsyncImage(url: item.idPhotoUrl.flatMap(URL.init(string:))) { $0.resizable().scaledToFit() } placeholder: { ProgressView() }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                Button("Close", systemImage: "xmark") { zoom = false }
                    .labelStyle(.iconOnly).buttonStyle(.glass).padding()
            }
        }
    }

    private func decide(_ decision: String) {
        Task {
            await runner.run {
                var body: [String: Any] = ["action": "verification", "id": item.id, "decision": decision, "requestId": requestID()]
                if decision == "rejected" { body["note"] = note }
                _ = try await API(session: session).run("/api/admin/console", body: body)
                return nil
            }
            if runner.error == nil { changed(); dismiss() }
        }
    }
}
