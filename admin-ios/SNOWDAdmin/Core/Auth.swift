import AuthenticationServices
import CryptoKit
import Foundation
import Security
import UIKit

enum Config {
    static let apiBase = URL(string: "https://www.snowd.ca")!
    static let webAdmin = URL(string: "https://www.snowd.ca/admin")!
    static let firebaseKey = "AIzaSyC2YAKVh5RP6vTmd2lel-yjH9okQGCKpGw"
    static let googleClientID = "119102068229-6fd835k0ef8a72mur4lcbn19rgf5lflc.apps.googleusercontent.com"
    static let googleScheme = "com.googleusercontent.apps.119102068229-6fd835k0ef8a72mur4lcbn19rgf5lflc"
    static let ownerEmail = "kacperprymicz@gmail.com"
}

struct AppError: LocalizedError {
    let message: String
    init(_ message: String) { self.message = message }
    var errorDescription: String? { message }
}

/// Refresh token lives in the Keychain, available only while this device is unlocked.
enum Keychain {
    private static let account = "firebase-refresh-token"
    private static let service = "ca.snowd.admin"
    static func save(_ value: String) {
        delete()
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account,
                                    kSecValueData as String: Data(value.utf8), kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
        SecItemAdd(query as CFDictionary, nil)
    }
    static func read() -> String? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account,
                                    kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
    static func delete() {
        SecItemDelete([kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account] as CFDictionary)
    }
}

@MainActor
@Observable
final class Session {
    enum State: Equatable { case loading, signedOut, signedIn }
    private(set) var state: State = .loading
    private(set) var email: String?
    private(set) var name: String?
    var error: String?

    private var idToken: String?
    private var expiresAt = Date.distantPast
    private var refreshToken: String?
    private var refreshing: Task<String, Error>?

    init() {
        Task { await restore() }
    }

    private func restore() async {
        #if DEBUG
        // Simulator review only: sample data, no network or sign-in. Never compiled into release builds.
        if Fixtures.enabled {
            Fixtures.install()
            idToken = "fixture"; expiresAt = .distantFuture; email = Config.ownerEmail; name = "Kacper Prymicz"
            state = .signedIn
            return
        }
        #endif
        guard let stored = Keychain.read() else { state = .signedOut; return }
        refreshToken = stored
        do {
            _ = try await token()
            state = .signedIn
        } catch {
            // A network failure keeps the session; only a rejected token signs out.
            if (error as? AppError)?.message == "expired" { signOut() } else { state = .signedIn }
        }
    }

    /// A fresh Firebase ID token, refreshed five minutes before it expires.
    func token(forceRefresh: Bool = false) async throws -> String {
        if !forceRefresh, let idToken, expiresAt.timeIntervalSinceNow > 300 { return idToken }
        if let refreshing { return try await refreshing.value }
        guard let refreshToken else { throw AppError("Sign in again.") }
        let task = Task { () throws -> String in
            var request = URLRequest(url: URL(string: "https://securetoken.googleapis.com/v1/token?key=\(Config.firebaseKey)")!)
            request.httpMethod = "POST"
            request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
            request.setValue(Bundle.main.bundleIdentifier, forHTTPHeaderField: "X-Ios-Bundle-Identifier")
            request.httpBody = form(["grant_type": "refresh_token", "refresh_token": refreshToken])
            let (data, response) = try await URLSession.shared.data(for: request)
            let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
            guard (response as? HTTPURLResponse)?.statusCode == 200, let token = json["id_token"] as? String else {
                if (response as? HTTPURLResponse)?.statusCode == 400 { throw AppError("expired") }
                throw AppError("Couldn't reach SNOWD. Check your connection.")
            }
            self.store(idToken: token, refreshToken: json["refresh_token"] as? String, expiresIn: json["expires_in"])
            return token
        }
        refreshing = task
        defer { refreshing = nil }
        return try await task.value
    }

    private func store(idToken: String, refreshToken: String?, expiresIn: Any?) {
        self.idToken = idToken
        let seconds = Double("\(expiresIn ?? "3600")") ?? 3600
        expiresAt = Date().addingTimeInterval(seconds)
        if let refreshToken { self.refreshToken = refreshToken; Keychain.save(refreshToken) }
        if let claims = Self.claims(idToken) {
            email = claims["email"] as? String
            name = claims["name"] as? String
        }
    }

    func signOut() {
        Keychain.delete()
        idToken = nil; refreshToken = nil; email = nil; name = nil
        expiresAt = .distantPast
        state = .signedOut
    }

    // MARK: Google → Firebase

    func signInWithGoogle(anchor: ASPresentationAnchor) async {
        error = nil
        do {
            let googleToken = try await GoogleSignIn(anchor: anchor).run()
            var request = URLRequest(url: URL(string: "https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=\(Config.firebaseKey)")!)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue(Bundle.main.bundleIdentifier, forHTTPHeaderField: "X-Ios-Bundle-Identifier")
            request.httpBody = try JSONSerialization.data(withJSONObject: [
                "postBody": "id_token=\(googleToken)&providerId=google.com", "requestUri": "http://localhost", "returnSecureToken": true,
            ])
            let (data, response) = try await URLSession.shared.data(for: request)
            let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
            guard (response as? HTTPURLResponse)?.statusCode == 200, let idToken = json["idToken"] as? String, let refresh = json["refreshToken"] as? String else {
                throw AppError("Firebase didn't accept this Google account.")
            }
            guard (json["email"] as? String)?.lowercased() == Config.ownerEmail else {
                throw AppError("SNOWD Admin is only for the SNOWD owner account.")
            }
            store(idToken: idToken, refreshToken: refresh, expiresIn: json["expiresIn"])
            // Activates or confirms admin access; the server checks the verified Firebase identity.
            let _: [String: JSONValue] = try await API(session: self).send("/api/admin/session", body: [:])
            state = .signedIn
        } catch let cancel as ASWebAuthenticationSessionError where cancel.code == .canceledLogin {
            return
        } catch {
            signOut()
            self.error = error.localizedDescription
        }
    }

    private static func claims(_ jwt: String) -> [String: Any]? {
        let parts = jwt.split(separator: ".")
        guard parts.count > 1 else { return nil }
        var payload = String(parts[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while payload.count % 4 != 0 { payload += "=" }
        guard let data = Data(base64Encoded: payload) else { return nil }
        return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    }
}

func form(_ values: [String: String]) -> Data {
    var allowed = CharacterSet.alphanumerics
    allowed.insert(charactersIn: "-._~")
    return Data(values.map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: allowed) ?? "")" }.joined(separator: "&").utf8)
}

/// OAuth 2 authorization code flow with PKCE in the system browser sheet.
@MainActor
final class GoogleSignIn: NSObject, ASWebAuthenticationPresentationContextProviding {
    private let anchor: ASPresentationAnchor
    private var session: ASWebAuthenticationSession?
    init(anchor: ASPresentationAnchor) { self.anchor = anchor }

    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated { anchor }
    }

    func run() async throws -> String {
        let verifier = Self.random(48)
        let challenge = Data(SHA256.hash(data: Data(verifier.utf8))).base64URL
        let state = Self.random(16)
        let redirect = "\(Config.googleScheme):/oauthredirect"
        var components = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        components.queryItems = [
            .init(name: "client_id", value: Config.googleClientID), .init(name: "redirect_uri", value: redirect),
            .init(name: "response_type", value: "code"), .init(name: "scope", value: "openid email profile"),
            .init(name: "code_challenge", value: challenge), .init(name: "code_challenge_method", value: "S256"),
            .init(name: "state", value: state), .init(name: "login_hint", value: Config.ownerEmail), .init(name: "prompt", value: "select_account"),
        ]
        let callback: URL = try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(url: components.url!, callback: .customScheme(Config.googleScheme)) { url, error in
                if let url { continuation.resume(returning: url) } else { continuation.resume(throwing: error ?? AppError("Google sign-in didn't finish.")) }
            }
            session.presentationContextProvider = self
            self.session = session
            session.start()
        }
        let items = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems ?? []
        guard items.first(where: { $0.name == "state" })?.value == state, let code = items.first(where: { $0.name == "code" })?.value else {
            throw AppError("Google sign-in was cancelled or didn't match this request.")
        }
        var request = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = form(["client_id": Config.googleClientID, "code": code, "code_verifier": verifier, "redirect_uri": redirect, "grant_type": "authorization_code"])
        let (data, _) = try await URLSession.shared.data(for: request)
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any], let idToken = json["id_token"] as? String else {
            throw AppError("Google didn't return a sign-in token.")
        }
        return idToken
    }

    private static func random(_ bytes: Int) -> String {
        var data = Data(count: bytes)
        _ = data.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, bytes, $0.baseAddress!) }
        return data.base64URL
    }
}

extension Data {
    var base64URL: String {
        base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
}
