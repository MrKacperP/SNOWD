#if DEBUG
import Foundation

/// Sample responses for reviewing screens in the simulator (launch with SNOWD_FIXTURES=1).
/// Debug builds only; release builds always talk to snowd.ca.
enum Fixtures {
    static var enabled: Bool { ProcessInfo.processInfo.environment["SNOWD_FIXTURES"] == "1" || CommandLine.arguments.contains("-snowdFixtures") }
    static func install() { URLProtocol.registerClass(FixtureProtocol.self) }

    static func response(for url: URL) -> String {
        let q = Dictionary(uniqueKeysWithValues: (URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []).map { ($0.name, $0.value ?? "") })
        let now = Date().timeIntervalSince1970 * 1000, day = 86_400_000.0
        let start = (now / day).rounded(.down) * day - 13 * day
        func series(_ values: [Int]) -> String { values.enumerated().map { "{\"day\":\(start + Double($0.offset) * day),\"value\":\($0.element)}" }.joined(separator: ",") }
        switch (url.path, q["view"] ?? q["section"] ?? "") {
        case ("/api/admin/monitor", "overview"):
            return """
            {"stats":{"accounts":15,"operators":6,"clients":8,"pendingVerifications":2,"openSupport":1,"activeJobs":2,"signIns24h":4,"signIns7d":11,"authUsers":17,"payments30d":10,"revenue30d":48600,"refunded30d":0,"held":7500},
             "series":{"signIns":[\(series([1,0,2,3,1,4,2,5,3,2,6,4,3,4]))],"signUps":[\(series([0,1,0,0,2,1,0,1,0,0,3,1,0,1]))],"revenue":[\(series([0,6000,0,600,4500,0,9000,0,7500,3000,0,6000,4000,8000]))]},
             "providers":[{"name":"Google","value":9},{"name":"Apple","value":4},{"name":"Email","value":3},{"name":"Phone","value":1}]}
            """
        case ("/api/admin/monitor", "logins"):
            let people = [("Natali Craig", "natali@example.com", "Google", "client", 0.02), ("Drew Cano", "drew@example.com", "Apple", "operator", 0.4), ("Kate Morrison", "kate@example.com", "Email", "client", 2.5), ("Orlando Diggs", "orlando@example.com", "Google", "operator", 5.0), ("Kacper Prymicz", Config.ownerEmail, "Google", "admin", 0.01)]
            return "{\"items\":[" + people.enumerated().map { i, p in
                "{\"id\":\"uid\(i)\",\"name\":\"\(p.0)\",\"email\":\"\(p.1)\",\"provider\":\"\(p.2)\",\"role\":\"\(p.3)\",\"disabled\":\(i == 3),\"emailVerified\":true,\"lastSignIn\":\(now - p.4 * day),\"lastRefresh\":\(now - p.4 * day / 2),\"createdAt\":\(now - 60 * day)}"
            }.joined(separator: ",") + "]}"
        case ("/api/admin/monitor", "payments"):
            let rows = [("CM9801", "paid", "card", 6000, "Natali Craig", "Meadow Lane Oakland"), ("CM9802", "held", "card", 7500, "Kate Morrison", "Larry San Francisco"), ("CM9803", "paid", "cash", 4500, "Drew Cano", "Bagwell Avenue Ocala"), ("CM9804", "refunded", "card", 3000, "Orlando Diggs", "Washburn Baton Rouge")]
            return "{\"next\":null,\"items\":[" + rows.enumerated().map { i, r in
                "{\"id\":\"tx\(i)\",\"jobId\":\"\(r.0)\",\"status\":\"\(r.1)\",\"method\":\"\(r.2)\",\"amount\":\(r.3),\"operatorAmount\":\(r.3 * 85 / 100),\"clientName\":\"\(r.4)\",\"clientId\":\"uid\(i)\",\"operatorName\":\"Drew Cano\",\"operatorId\":\"uid1\",\"address\":\"\(r.5)\",\"description\":\"Snow removal at \(r.5)\",\"createdAt\":\(now - Double(i) * 3_600_000 * 7)}"
            }.joined(separator: ",") + "]}"
        case ("/api/admin/monitor", "verifications"):
            return """
            {"pending":[{"id":"uid1","name":"Drew Cano","email":"drew@example.com","role":"operator","status":"pending","idPhotoUrl":null,"submittedAt":\(now - 3_600_000),"createdAt":\(now - 9 * day)}],
             "reviewed":[{"id":"uid0","name":"Natali Craig","email":"natali@example.com","role":"operator","status":"approved","reviewedBy":"Kacper","reviewedAt":\(now - 2 * day),"createdAt":\(now - 30 * day)}]}
            """
        case (_, "accounts"), (_, "jobs"), (_, "support"), (_, "activity"):
            if let id = q["id"] {
                return "{\"item\":{\"id\":\"\(id)\",\"displayName\":\"Natali Craig\",\"email\":\"natali@example.com\",\"role\":\"client\",\"status\":\"pending\",\"paymentStatus\":\"held\",\"paymentMethod\":\"card\",\"stripePaymentIntentId\":\"pi_123\",\"price\":75,\"address\":\"Meadow Lane\",\"city\":\"Oakville\",\"subject\":\"Account support\",\"userName\":\"Natali Craig\",\"createdAt\":{\"_seconds\":\(Int(now / 1000) - 86_400)}},\"messages\":[{\"id\":\"m1\",\"senderId\":\"u\",\"senderName\":\"Natali\",\"content\":\"My driveway wasn't finished.\"},{\"id\":\"m2\",\"senderId\":\"SNOWD_ADMIN\",\"content\":\"Sorry about that, we're sending the operator back.\"}]}"
            }
            return "{\"next\":null,\"items\":[{\"id\":\"a1\",\"displayName\":\"Natali Craig\",\"email\":\"natali@example.com\",\"role\":\"client\",\"orderNumber\":\"1042\",\"status\":\"in-progress\",\"address\":\"Meadow Lane\",\"price\":75,\"paymentStatus\":\"held\",\"userName\":\"Natali Craig\",\"lastMessage\":\"My driveway wasn't finished.\",\"description\":\"verification\",\"type\":\"Verification\"}]}"
        case (_, "pricing"):
            return "{\"policy\":{\"commissionPercent\":10,\"transactionFeeCents\":99,\"discountPercent\":0}}"
        default:
            return "{\"success\":true,\"message\":\"Saved (sample).\"}"
        }
    }
}

final class FixtureProtocol: URLProtocol {
    override class func canInit(with request: URLRequest) -> Bool { request.url?.host == Config.apiBase.host }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        let data = Data(Fixtures.response(for: request.url!).utf8)
        client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: ["Content-Type": "application/json"])!, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data)
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}
#endif
