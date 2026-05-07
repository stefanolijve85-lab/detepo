//
//  RemoteConfigService.swift
//
//  LiveOps-tunable parameters fetched from /remote-config and cached locally.
//  Falls back to bundled defaults if the call fails.
//

import Foundation

public enum RemoteConfigKey: String, CaseIterable, Sendable {
    case startSpeed
    case maxSpeed
    case speedTimeConstant
    case maxDensity
    case biomeStageSeconds
    case maxRevivesPerRun
    case coinMultiplier
    case xpMultiplier
    case bpXPMultiplier
    case eventJetpackDropId
    case reviveChipCost
    case audioIntensityFloor
}

@MainActor
final class RemoteConfigService {
    private let backend: BackendClient
    private var values: [String: ConfigValue] = [:]

    init(backend: BackendClient) {
        self.backend = backend
    }

    func refresh() async {
        do {
            let dto: [String: ConfigValue] = try await backend.get("/api/game/v1/remote-config")
            self.values = dto
        } catch {
            // Use defaults (silent).
        }
    }

    func value<T: Decodable>(_ key: RemoteConfigKey, default fallback: T) -> T {
        guard let stored = values[key.rawValue] else { return fallback }
        return (stored.decode(as: T.self)) ?? fallback
    }
}

struct ConfigValue: Decodable {
    let raw: String

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let s = try? c.decode(String.self) { raw = s; return }
        if let d = try? c.decode(Double.self) { raw = String(d); return }
        if let i = try? c.decode(Int.self) { raw = String(i); return }
        if let b = try? c.decode(Bool.self) { raw = b ? "1" : "0"; return }
        raw = ""
    }

    func decode<T: Decodable>(as type: T.Type) -> T? {
        if T.self == Float.self  { return Float(raw)  as? T }
        if T.self == Double.self { return Double(raw) as? T }
        if T.self == Int.self    { return Int(raw)    as? T }
        if T.self == Bool.self   { return (raw == "1" || raw == "true") as? T }
        if T.self == String.self { return raw as? T }
        return nil
    }
}
