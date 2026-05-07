//
//  HUDSnapshot.swift
//
//  Immutable snapshot of HUD-relevant state computed each tick. The HUD view
//  observes only this struct so we can re-render in O(props that changed).
//

import Foundation

public struct PowerUpSnapshot: Identifiable, Hashable, Sendable {
    public let id: PowerUpKind
    public let kind: PowerUpKind
    public let durationRemaining: TimeInterval
    public let totalDuration: TimeInterval
    public var fraction: Double { max(0, min(1, durationRemaining / max(0.001, totalDuration))) }
}

public struct HUDSnapshot: Equatable, Sendable {
    public let score: Int
    public let scoreDelta: Int
    public let distanceMeters: Int
    public let coins: Int
    public let chips: Int
    public let comboTier: Int
    public let comboMultiplier: Double
    public let comboFraction: Double
    public let activePowerUps: [PowerUpSnapshot]
    public let jetpackFuel: TimeInterval
    public let jetpackCapacity: TimeInterval
    public let jetpackActive: Bool
    public let speedMps: Float
    public let biome: BiomeID

    public static let empty = HUDSnapshot(
        score: 0, scoreDelta: 0, distanceMeters: 0, coins: 0, chips: 0,
        comboTier: 0, comboMultiplier: 1.0, comboFraction: 0,
        activePowerUps: [],
        jetpackFuel: 0, jetpackCapacity: 8, jetpackActive: false,
        speedMps: 0,
        biome: .cyberCity
    )
}
