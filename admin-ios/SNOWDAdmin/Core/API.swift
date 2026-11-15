import Foundation

/// Any JSON value. Admin records vary by collection, so detail screens read fields by name.
enum JSONValue: Codable, Hashable, Sendable {
    case string(String), number(Double), bool(Bool), object([String: JSONValue]), array([JSONValue]), null

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let v = try? c.decode(Bool.self) { self = .bool(v) }
        else if let v = try? c.decode(Double.self) { self = .number(v) }
        else if let v = try? c.decode(String.self) { self = .string(v) }
        else if let v = try? c.decode([JSONValue].self) { self = .array(v) }
        else { self = .object(try c.decode([String: JSONValue].self)) }
    }
    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .string(let v): try c.encode(v)
        case .number(let v): try c.encode(v)
        case .bool(let v): try c.encode(v)
        case .object(let v): try c.encode(v)
        case .array(let v): try c.encode(v)
        case .null: try c.encodeNil()
        }
    }
    subscript(key: String) -> JSONValue? { if case .object(let o) = self { o[key] } else { nil } }
    var string: String? {
        switch self { case .string(let v): v.isEmpty ? nil : v; case .number(let v): v == v.rounded() ? String(Int(v)) : String(v); case .bool(let v): String(v); default: nil }
    }
    var number: Double? { if case .number(let v) = self { v } else if case .string(let s) = self { Double(s) } else { nil } }
    var bool: Bool { if case .bool(let v) = self { v } else { false } }
    /// Firestore timestamps arrive as {_seconds, _nanoseconds}, {seconds}, epoch millis, or ISO strings.
    var date: Date? {
        switch self {
        case .number(let v): return Date(timeIntervalSince1970: v > 1e12 ? v / 1000 : v)
        case .string(let s): return ISO8601DateFormatter().date(from: s)
        case .object(let o):
            if let s = (o["_seconds"] ?? o["seconds"])?.number { return Date(timeIntervalSince1970: s) }
            return nil
        default: return nil
        }
    }
}

typealias Record = [String: JSONValue]
extension Dictionary where Key == String, Value == JSONValue {
    var id: String { self["id"]?.string ?? "" }
    func text(_ key: String) -> String? { self[key]?.string }
}

struct API {
    let session: Session

    func get<T: Decodable>(_ path: String, query: [String: String?] = [:]) async throws -> T {
        try await request(path, query: query, method: "GET", body: nil)
    }

    @discardableResult
    func send<T: Decodable>(_ path: String, method: String = "POST", body: [String: Any]) async throws -> T {
        try await request(path, query: [:], method: method, body: body)
    }

    func run(_ path: String, method: String = "POST", body: [String: Any] = [:]) async throws -> Record {
        try await request(path, query: [:], method: method, body: body)
    }

    /// For endpoints that compare JSON text, where key order must be preserved.
    func run(_ path: String, json: String) async throws -> Record {
        try await request(path, query: [:], method: "POST", body: nil, raw: Data(json.utf8))
    }

    private func request<T: Decodable>(_ path: String, query: [String: String?], method: String, body: [String: Any]?, raw: Data? = nil, retry: Bool = true) async throws -> T {
        var components = URLComponents(url: Config.apiBase.appending(path: path), resolvingAgainstBaseURL: false)!
        let items = query.compactMap { key, value in value.map { URLQueryItem(name: key, value: $0) } }
        if !items.isEmpty { components.queryItems = items }
        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("Bearer \(try await session.token())", forHTTPHeaderField: "Authorization")
        if let body = try raw ?? body.map({ try JSONSerialization.data(withJSONObject: $0) }) {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = body
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 401 && retry {
            _ = try await session.token(forceRefresh: true)
            return try await self.request(path, query: query, method: method, body: body, raw: raw, retry: false)
        }
        guard (200..<300).contains(status) else {
            let message = (try? JSONDecoder().decode([String: JSONValue].self, from: data))?["error"]?.string
            if status == 404 && message == nil { throw AppError("This needs the latest SNOWD server update.") }
            throw AppError(message ?? "SNOWD returned an error (\(status)). Try again.")
        }
        do { return try JSONDecoder().decode(T.self, from: data) }
        catch { throw AppError("SNOWD sent data this app couldn't read.") }
    }
}

// MARK: Monitor feed (/api/admin/monitor)

struct Point: Codable, Hashable, Identifiable { let day: Double; let value: Double; var id: Double { day }; var date: Date { Date(timeIntervalSince1970: day / 1000) } }
struct Overview: Codable {
    struct Stats: Codable {
        let accounts, operators, clients, pendingVerifications, openSupport, activeJobs, signIns24h, signIns7d, authUsers, payments30d: Int
        let revenue30d, refunded30d, held: Double
    }
    struct Series: Codable { let signIns, signUps, revenue: [Point] }
    struct Share: Codable, Identifiable { let name: String; let value: Int; var id: String { name } }
    let stats: Stats
    let series: Series
    let providers: [Share]
}

struct Login: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let email, phone, role, verificationStatus: String?
    let provider: String
    let disabled, emailVerified: Bool
    let lastSignIn, lastRefresh, createdAt: Double?
}
struct Logins: Codable { let items: [Login] }

struct Payment: Codable, Identifiable, Hashable {
    let id: String
    let jobId, description, address, clientId, clientName, operatorId, operatorName, stripePaymentIntentId: String?
    let status, method: String
    let amount: Double
    let operatorAmount, platformFee, createdAt, updatedAt: Double?
}
struct Payments: Codable { let items: [Payment]; let next: Double? }

struct Verification: Codable, Identifiable, Hashable {
    let id, name: String
    let email, phone, role, status, idPhotoUrl, note, reviewedBy: String?
    let submittedAt, reviewedAt, createdAt: Double?
}
struct Verifications: Codable { let pending, reviewed: [Verification] }

struct Page: Codable { let items: [Record]?; let item: Record?; let messages: [Record]?; let next: String?; let policy: Record? }

func requestID() -> String { UUID().uuidString.replacingOccurrences(of: "-", with: "") }
