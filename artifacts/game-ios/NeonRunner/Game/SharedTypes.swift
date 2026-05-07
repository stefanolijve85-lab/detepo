//
//  SharedTypes.swift
//
//  Lightweight value types shared across systems. Kept in a single file because
//  they are tiny and tightly related; splitting them would harm discoverability.
//

import Foundation
import simd

public typealias Vec3 = SIMD3<Float>
public typealias Vec2 = SIMD2<Float>

/// World space orientation: Y up, Z forward (positive Z = direction of travel).
public enum Axis {
    public static let up: Vec3       = SIMD3(0, 1, 0)
    public static let forward: Vec3  = SIMD3(0, 0, 1)
    public static let right: Vec3    = SIMD3(1, 0, 0)
}

public enum DeathCause: String, Sendable, Hashable, Codable {
    case crash
    case fall
    case quit
    case reviveFailed = "revive_failed"
}

public enum ObstacleArchetype: String, Sendable, Hashable, Codable {
    case lowBar = "low_bar"            // slide
    case barrier = "barrier"           // jump
    case droneSwarm = "drone_swarm"    // dodge lane
    case fence = "fence"               // jump
    case pit = "pit"                   // jump-or-jet
    case billboard = "billboard"       // duck/slide
    case hoverCar = "hover_car"        // dodge lane
    case antennaTop = "antenna_top"    // sky-only hard hazard
}

public enum PowerUpKind: String, Sendable, Hashable, Codable, CaseIterable {
    case coinMagnet
    case doubleCoins
    case slowMotion
    case shield
    case scoreMultiplier
    case speedBoost
    case timeFreeze
    case megaJump
    case ghostMode
    case autoDodge
}

public struct ObstacleID: Hashable, Sendable, Codable {
    public let raw: UInt32
    public init(_ raw: UInt32) { self.raw = raw }
}

public enum LeaderboardScope: Hashable, Sendable {
    case global
    case country(iso: String)
    case friends
    case weekly
    case season(seasonId: String)
    case event(eventId: String)
}

public enum BiomeID: String, Sendable, Hashable, Codable, CaseIterable {
    case cyberCity = "cyber_city"
    case rooftop
    case subway
    case neonHighway = "neon_highway"
    case industrial
    case skyCity = "sky_city"
}

public struct RunSummary: Hashable, Sendable, Codable, Identifiable {
    public let id: String                  // ULID
    public let seed: UInt64
    public let startedAt: Date
    public let endedAt: Date
    public let durationMs: Int
    public let distanceCm: Int
    public let coins: Int
    public let chips: Int
    public let scoreClient: Int
    public let comboMax: Int
    public let nearMisses: Int
    public let causeOfDeath: DeathCause
    public let biomePath: [BiomeID]
    public let jetpackTimeMs: Int
    public let powerUpsUsed: [PowerUpKind: Int]
    public let clientVersion: String
    public let deviceModel: String
}

/// Symmetric, deterministic 64-bit RNG seeded from a single `seed`. Used by the
/// chunk streamer and obstacle spawner so the same seed reproduces the same run.
public struct DeterministicRNG: Sendable {
    private var state: UInt64
    public init(seed: UInt64) { self.state = seed == 0 ? 0xCAFEF00DDEADBEEF : seed }
    public mutating func next() -> UInt64 {
        // splitmix64
        state &+= 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }
    public mutating func next(below upper: UInt32) -> UInt32 {
        let x = next()
        return UInt32(truncatingIfNeeded: x) % upper
    }
    public mutating func unitFloat() -> Float {
        Float(next() >> 40) / Float(1 << 24)
    }
    public mutating func roll(_ probability: Float) -> Bool { unitFloat() < probability }
}
