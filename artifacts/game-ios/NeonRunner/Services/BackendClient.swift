//
//  BackendClient.swift
//
//  Tiny typed HTTP client over URLSession + async/await. JSON in/out via
//  Codable. Bearer JWT injected via the token provider closure so we can
//  swap auth for unit tests.
//

import Foundation

@MainActor
final class BackendClient {

    let baseURL: URL
    private let tokenProvider: () -> String?
    private let analytics: AnalyticsDispatcher
    private let session: URLSession

    init(baseURL: URL, tokenProvider: @escaping () -> String?, analytics: AnalyticsDispatcher) {
        self.baseURL = baseURL
        self.tokenProvider = tokenProvider
        self.analytics = analytics
        let config = URLSessionConfiguration.default
        config.waitsForConnectivity = true
        config.timeoutIntervalForRequest = 12
        config.timeoutIntervalForResource = 30
        config.httpAdditionalHeaders = ["Accept": "application/json"]
        self.session = URLSession(configuration: config)
    }

    // MARK: - Public

    func get<T: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws -> T {
        try await send(method: "GET", path: path, query: query, body: Optional<EmptyBody>.none)
    }

    func post<T: Decodable, B: Encodable>(_ path: String, body: B?, idempotencyKey: String? = nil) async throws -> T {
        try await send(method: "POST", path: path, body: body, idempotencyKey: idempotencyKey)
    }

    @discardableResult
    func postVoid<B: Encodable>(_ path: String, body: B?) async throws -> Int {
        try await sendStatus(method: "POST", path: path, body: body)
    }

    // MARK: - Internal

    private struct EmptyBody: Encodable {}

    private func send<T: Decodable, B: Encodable>(method: String, path: String, query: [URLQueryItem] = [], body: B?, idempotencyKey: String? = nil) async throws -> T {
        let request = try buildRequest(method: method, path: path, query: query, body: body, idempotencyKey: idempotencyKey)
        let (data, response) = try await session.data(for: request)
        try check(response: response, data: data)
        return try decode(data)
    }

    private func sendStatus<B: Encodable>(method: String, path: String, body: B?) async throws -> Int {
        let request = try buildRequest(method: method, path: path, query: [], body: body, idempotencyKey: nil)
        let (_, response) = try await session.data(for: request)
        return (response as? HTTPURLResponse)?.statusCode ?? 0
    }

    private func buildRequest<B: Encodable>(method: String, path: String, query: [URLQueryItem], body: B?, idempotencyKey: String?) throws -> URLRequest {
        var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { components.queryItems = query }
        guard let url = components.url else { throw BackendError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = method
        if let body, !(body is EmptyBody) {
            request.httpBody = try JSONEncoder.iso8601.encode(body)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if let token = tokenProvider() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let idem = idempotencyKey {
            request.setValue(idem, forHTTPHeaderField: "Idempotency-Key")
        }
        request.setValue(AppInfo.versionString, forHTTPHeaderField: "X-Client-Version")
        request.setValue(AppInfo.deviceModel, forHTTPHeaderField: "X-Client-Device")
        return request
    }

    private func check(response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else { throw BackendError.transport }
        if (200...299).contains(http.statusCode) { return }
        if let problem = try? JSONDecoder().decode(ProblemDetails.self, from: data) {
            throw BackendError.apiError(http.statusCode, problem)
        }
        throw BackendError.httpStatus(http.statusCode)
    }

    private func decode<T: Decodable>(_ data: Data) throws -> T {
        do {
            return try JSONDecoder.iso8601.decode(T.self, from: data)
        } catch {
            analytics.log(.decodeFailed(error: error.localizedDescription))
            throw BackendError.decode(error)
        }
    }
}

public enum BackendError: Error, LocalizedError {
    case invalidURL
    case transport
    case httpStatus(Int)
    case apiError(Int, ProblemDetails)
    case decode(Error)

    public var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .transport: return "Network error"
        case .httpStatus(let s): return "HTTP \(s)"
        case .apiError(_, let p): return p.title ?? "API error"
        case .decode(let e): return "Decode: \(e.localizedDescription)"
        }
    }
}

public struct ProblemDetails: Decodable, Sendable {
    public let type: String?
    public let title: String?
    public let detail: String?
    public let status: Int?
    public let code: String?
}

extension JSONEncoder {
    static let iso8601: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        e.keyEncodingStrategy = .convertToSnakeCase
        return e
    }()
}

extension JSONDecoder {
    static let iso8601: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()
}
