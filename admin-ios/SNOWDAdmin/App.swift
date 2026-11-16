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

/// Face ID lock. One evaluation at a time, and only time spent away while unlocked can relock it.
@MainActor @Observable final class AppLock {
    static let shared = AppLock()
    private(set) var locked: Bool
    private(set) var evaluating = false
    var failed = false
    private var autoPrompted = false
    private var backgroundedAt: Date?
    private var context: LAContext?

    private init() { locked = UserDefaults.standard.object(forKey: "faceIDLock") as? Bool ?? true }

    func setEnabled(_ on: Bool) { if !on { locked = false } }

    /// Asks once by itself when the lock screen appears; after that only the Unlock button asks.
    func autoUnlock() {
        guard !autoPrompted else { return }
        autoPrompted = true
        unlock()
    }

    func unlock() {
        guard locked, !evaluating else { return }
        #if DEBUG
        if Fixtures.enabled { locked = false; return }
        #endif
        let context = LAContext()
        var error: NSError?
        // No passcode or biometrics set up: nothing to check against.
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else { locked = false; return }
        self.context = context
        evaluating = true
        failed = false
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Unlock SNOWD Admin") { ok, _ in
            Task { @MainActor in
                self.evaluating = false
                self.context = nil
                if ok { self.locked = false } else { self.failed = true }
            }
        }
    }

    func phaseChanged(_ phase: ScenePhase, enabled: Bool) {
        // The Face ID sheet itself makes the app inactive, so ignore everything while locked or checking.
        guard enabled, !locked, !evaluating else { return }
        if phase == .background { backgroundedAt = Date() }
        if phase == .active, let since = backgroundedAt {
            backgroundedAt = nil
            // Lock again after a minute away.
            if Date().timeIntervalSince(since) > 60 { locked = true; autoPrompted = false }
        }
    }
}

struct RootView: View {
    @Environment(Session.self) private var session
    @Environment(\.scenePhase) private var phase
    @AppStorage("faceIDLock") private var lockEnabled = true
    @State private var lock = AppLock.shared

    var body: some View {
        ZStack {
            switch session.state {
            case .loading: ProgressView()
            case .signedOut: SignInView()
            case .signedIn: MainTabs()
            }
            if session.state == .signedIn && lockEnabled && lock.locked { LockView() }
        }
        .onChange(of: phase) { _, new in lock.phaseChanged(new, enabled: lockEnabled) }
        .onChange(of: lockEnabled) { _, on in lock.setEnabled(on) }
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
        .task(id: AppLock.shared.locked) {
            guard !AppLock.shared.locked || !(UserDefaults.standard.object(forKey: "faceIDLock") as? Bool ?? true) else { return }
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
    @State private var lock = AppLock.shared
    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "lock.fill").font(.system(size: 40)).foregroundStyle(.secondary)
            Text("SNOWD Admin is locked").font(.title3.bold())
            Button("Unlock") { lock.unlock() }
                .buttonStyle(.glassProminent).controlSize(.large)
                .disabled(lock.evaluating)
            if lock.failed { Text("Couldn't confirm it's you. Tap Unlock to try again.").font(.footnote).foregroundStyle(.secondary) }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.ultraThinMaterial)
        .onAppear { lock.autoUnlock() }
    }
}
