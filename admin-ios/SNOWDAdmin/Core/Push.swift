import SwiftUI
import UserNotifications

/// Alert types the server can send; matches ADMIN_PUSH_CATEGORIES in src/lib/adminPush.ts.
enum AlertCategory: String, CaseIterable, Identifiable {
    case logins, payments, verifications, support, jobs, accounts
    var id: String { rawValue }
    var title: String {
        switch self {
        case .logins: "Sign-ins & sign-ups"; case .payments: "Payments"; case .verifications: "ID uploads"
        case .support: "Support messages"; case .jobs: "New work orders"; case .accounts: "Account deletion requests"
        }
    }
    var symbol: String {
        switch self {
        case .logins: "person.badge.key.fill"; case .payments: "creditcard.fill"; case .verifications: "checkmark.shield.fill"
        case .support: "bubble.left.and.bubble.right.fill"; case .jobs: "list.clipboard.fill"; case .accounts: "person.crop.circle.badge.xmark"
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = Push.shared
        return true
    }
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        Task { @MainActor in await Push.shared.registered(token: token) }
    }
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        Task { @MainActor in Push.shared.error = "Couldn't register for notifications: \(error.localizedDescription)" }
    }
}

@MainActor
@Observable
final class Push: NSObject, UNUserNotificationCenterDelegate {
    static let shared = Push()
    private(set) var status: UNAuthorizationStatus = .notDetermined
    private(set) var token: String?
    var error: String?
    private var session: Session?

    var enabled: Set<AlertCategory> {
        get {
            guard let saved = UserDefaults.standard.stringArray(forKey: "alertCategories") else { return Set(AlertCategory.allCases) }
            return Set(saved.compactMap(AlertCategory.init(rawValue:)))
        }
        set {
            UserDefaults.standard.set(newValue.map(\.rawValue), forKey: "alertCategories")
            Task { await upload() }
        }
    }

    /// Called once signed in: asks permission the first time, then registers with Apple.
    func start(_ session: Session) async {
        self.session = session
        let center = UNUserNotificationCenter.current()
        if await center.notificationSettings().authorizationStatus == .notDetermined {
            _ = try? await center.requestAuthorization(options: [.alert, .sound, .badge])
        }
        await refreshStatus()
        if status == .authorized || status == .provisional { UIApplication.shared.registerForRemoteNotifications() }
    }

    func refreshStatus() async { status = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus }

    func registered(token: String) async {
        self.token = token
        await upload()
    }

    private func upload() async {
        guard let session, let token, session.state == .signedIn else { return }
        #if DEBUG
        let sandbox = true
        #else
        let sandbox = false
        #endif
        do {
            try await API(session: session).run("/api/admin/push-token", body: ["token": token, "categories": enabled.map(\.rawValue), "sandbox": sandbox])
            error = nil
        } catch { self.error = error.localizedDescription }
    }

    /// Stops alerts to this phone before signing out.
    func unregister() async {
        guard let session, let token else { return }
        _ = try? await API(session: session).run("/api/admin/push-token", method: "DELETE", body: ["token": token])
    }

    func sendTest() async throws -> String {
        guard let session else { throw AppError("Sign in first.") }
        if token == nil { throw AppError("This iPhone isn't registered for notifications yet.") }
        await upload()
        return try await API(session: session).run("/api/admin/push-token", body: ["action": "test"])["message"]?.string ?? "Sent."
    }

    // Show alerts while the app is open, and open the matching tab when one is tapped.
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .list]
    }
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        let tab = response.notification.request.content.userInfo["tab"] as? String
        await MainActor.run {
            switch tab {
            case "logins": Navigator.shared.tab = .logins
            case "payments": Navigator.shared.tab = .payments
            case "verify": Navigator.shared.tab = .verify
            case "manage": Navigator.shared.tab = .manage
            default: Navigator.shared.tab = .overview
            }
        }
    }
}

struct NotificationsView: View {
    @State private var push = Push.shared
    @State private var runner = ActionRunner()
    @Environment(\.scenePhase) private var phase
    @Environment(\.openURL) private var openURL

    var body: some View {
        Form {
            if let error = runner.error ?? push.error { Banner(text: error) }
            if let success = runner.success { Banner(text: success, tone: .green) }
            if push.status == .denied {
                Section {
                    Button("Turn on in Settings", systemImage: "gear") { openURL(URL(string: UIApplication.openSettingsURLString)!) }
                } footer: { Text("Notifications are off for SNOWD Admin in iPhone Settings.") }
            }
            Section {
                ForEach(AlertCategory.allCases) { category in
                    Toggle(isOn: Binding(get: { push.enabled.contains(category) }, set: { on in
                        var set = push.enabled
                        if on { set.insert(category) } else { set.remove(category) }
                        push.enabled = set
                    })) { Label(category.title, systemImage: category.symbol) }
                }
            } header: { Text("Alert me about") } footer: {
                Text("Your own sign-ins don't alert you. Repeat sign-ins from the same person are grouped for five minutes.")
            }
            .disabled(push.status == .denied)
            Section {
                Button("Send a test notification", systemImage: "bell.badge") {
                    Task { await runner.run { try await Push.shared.sendTest() } }
                }
                .disabled(runner.busy || push.status != .authorized)
            }
        }
        .navigationTitle("Notifications")
        .task { await push.refreshStatus() }
        .onChange(of: phase) { _, new in if new == .active { Task { await push.refreshStatus() } } }
    }
}
