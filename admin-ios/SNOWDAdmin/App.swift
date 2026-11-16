import LocalAuthentication
import SwiftUI

@main
struct SNOWDAdminApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @State private var session = Session()
    var body: some Scene {
        WindowGroup {
            RootView().environment(session)
        }
    }
}

enum AppTab: Hashable { case overview, logins, payments, verify, manage }

/// Lets any screen jump to another tab, e.g. the overview's pending-verification tile.
@MainActor @Observable final class Navigator {
    static let shared = Navigator()
    var tab: AppTab = .overview
}

struct RootView: View {
    @Environment(Session.self) private var session
    @Environment(\.scenePhase) private var phase
    @AppStorage("faceIDLock") private var lockEnabled = true
    @State private var locked = true
    @State private var backgroundedAt: Date?

    var body: some View {
        ZStack {
            switch session.state {
            case .loading: ProgressView()
            case .signedOut: SignInView()
            case .signedIn: MainTabs()
            }
            if session.state == .signedIn && lockEnabled && locked { LockView { locked = false } }
        }
        .onChange(of: phase) { _, new in
            // The Face ID sheet itself moves the app out of .active, so only time away while unlocked counts.
            if new == .background && !locked { backgroundedAt = Date() }
            if new == .active, let since = backgroundedAt {
                backgroundedAt = nil
                // Lock again after a minute away.
                if Date().timeIntervalSince(since) > 60 { locked = true }
            }
        }
    }
}

struct MainTabs: View {
    @State private var nav = Navigator.shared
    @State private var badge = 0
    @Environment(Session.self) private var session

    var body: some View {
        TabView(selection: $nav.tab) {
            Tab("Overview", systemImage: "square.grid.2x2.fill", value: AppTab.overview) { OverviewView() }
            Tab("Logins", systemImage: "person.badge.key.fill", value: AppTab.logins) { LoginsView() }
            Tab("Payments", systemImage: "creditcard.fill", value: AppTab.payments) { PaymentsView() }
            Tab("Verify", systemImage: "checkmark.shield.fill", value: AppTab.verify) { VerifyView() }
                .badge(badge)
            Tab("Manage", systemImage: "slider.horizontal.3", value: AppTab.manage) { ManageView() }
        }
        .tabBarMinimizeBehavior(.onScrollDown)
        .tabViewStyle(.sidebarAdaptable)
        .environment(nav)
        .task {
            await Push.shared.start(session)
            if let v: Verifications = try? await API(session: session).get("/api/admin/monitor", query: ["view": "verifications"]) { badge = v.pending.count }
        }
    }
}

struct SignInView: View {
    @Environment(Session.self) private var session
    @State private var busy = false

    var body: some View {
        VStack(spacing: 22) {
            Spacer()
            Image("Penguin").resizable().scaledToFill()
                .frame(width: 120, height: 120).clipShape(.rect(cornerRadius: 28))
                .shadow(color: .black.opacity(0.15), radius: 20, y: 10)
            VStack(spacing: 6) {
                Text("SNOWD Admin").font(.largeTitle.bold())
                Text("Monitor sign-ins, payments and verifications.").foregroundStyle(.secondary).multilineTextAlignment(.center)
            }
            Spacer()
            if let error = session.error { Banner(text: error) }
            Button {
                guard let anchor = UIApplication.shared.connectedScenes.compactMap({ ($0 as? UIWindowScene)?.keyWindow }).first else { return }
                busy = true
                Task { await session.signInWithGoogle(anchor: anchor); busy = false }
            } label: {
                HStack { if busy { ProgressView() } else { Image(systemName: "person.crop.circle.badge.checkmark") }; Text("Continue with Google") }
                    .font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
            }
            .buttonStyle(.glassProminent)
            .controlSize(.large)
            .disabled(busy)
            Text("Only the SNOWD owner account can sign in.").font(.footnote).foregroundStyle(.secondary)
        }
        .padding(24)
        .background(LinearGradient(colors: [Color.snowBlue.opacity(0.18), Color(.systemBackground)], startPoint: .top, endPoint: .center).ignoresSafeArea())
    }
}

struct LockView: View {
    let unlocked: () -> Void
    @State private var failed = false
    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "lock.fill").font(.system(size: 40)).foregroundStyle(.secondary)
            Text("SNOWD Admin is locked").font(.title3.bold())
            Button("Unlock") { authenticate() }.buttonStyle(.glassProminent).controlSize(.large)
            if failed { Text("Couldn't confirm it's you.").font(.footnote).foregroundStyle(.secondary) }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.ultraThinMaterial)
        .task { authenticate() }
    }
    private func authenticate() {
        #if DEBUG
        if Fixtures.enabled { unlocked(); return }
        #endif
        let context = LAContext()
        var error: NSError?
        // No passcode or biometrics set up: nothing to check against.
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else { unlocked(); return }
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Unlock SNOWD Admin") { ok, _ in
            Task { @MainActor in if ok { unlocked() } else { failed = true } }
        }
    }
}
