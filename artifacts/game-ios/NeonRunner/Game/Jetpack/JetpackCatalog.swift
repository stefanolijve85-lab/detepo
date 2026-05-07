//
//  JetpackCatalog.swift
//
//  Static catalog of jetpacks. Tunable via remote-config later (see RemoteConfigKey),
//  but the source of truth is this struct so the game ships with sane defaults.
//

import Foundation

public enum JetpackRarity: String, Codable, Sendable {
    case common, rare, epic, legendary
}

public struct JetpackCatalogEntry: Hashable, Identifiable, Sendable, Codable {
    public let id: String
    public let displayName: String
    public let rarity: JetpackRarity
    public let fuelCapacity: TimeInterval
    public let climbRate: Float            // m/s
    public let descendRate: Float          // m/s
    public let drainMultiplier: Float
    public let boostFactor: Float          // forward-speed multiplier while flying
    public let trailPreset: String         // -> particle id
    public let ignitionAudio: String
    public let loopAudio: String
    public let sputterAudio: String
    public let unlockHint: String
}

@MainActor
final class JetpackCatalog {
    static let shared = JetpackCatalog()

    let entries: [JetpackCatalogEntry] = [
        .init(id: "jp_basic_v1",       displayName: "Basic Thruster",     rarity: .common,     fuelCapacity: 8,  climbRate: 4.5, descendRate: 3.5, drainMultiplier: 1.00, boostFactor: 1.10, trailPreset: "trail_white_smoke",      ignitionAudio: "jet_ig_basic",   loopAudio: "jet_lp_basic",   sputterAudio: "jet_sp_basic",   unlockHint: "Starter pack"),
        .init(id: "jp_neon_plasma_v1", displayName: "Neon Plasma",        rarity: .rare,       fuelCapacity: 11, climbRate: 5.5, descendRate: 3.5, drainMultiplier: 0.95, boostFactor: 1.12, trailPreset: "trail_magenta_plasma",   ignitionAudio: "jet_ig_plasma",  loopAudio: "jet_lp_plasma",  sputterAudio: "jet_sp_plasma",  unlockHint: "Shop, 350 Chips"),
        .init(id: "jp_military_v1",    displayName: "Military Thruster",  rarity: .epic,       fuelCapacity: 14, climbRate: 6.5, descendRate: 4.0, drainMultiplier: 0.92, boostFactor: 1.15, trailPreset: "trail_red_flame",        ignitionAudio: "jet_ig_milit",   loopAudio: "jet_lp_milit",   sputterAudio: "jet_sp_milit",   unlockHint: "Battle Pass T30"),
        .init(id: "jp_quantum_v1",     displayName: "Quantum Gravity",    rarity: .epic,       fuelCapacity: 12, climbRate: 7.5, descendRate: 4.0, drainMultiplier: 0.90, boostFactor: 1.18, trailPreset: "trail_violet_ribbon",    ignitionAudio: "jet_ig_quant",   loopAudio: "jet_lp_quant",   sputterAudio: "jet_sp_quant",   unlockHint: "Shop, 950 Chips"),
        .init(id: "jp_dragon_v1",      displayName: "Legendary Dragon",   rarity: .legendary,  fuelCapacity: 16, climbRate: 7.0, descendRate: 4.0, drainMultiplier: 0.85, boostFactor: 1.20, trailPreset: "trail_gold_ember",       ignitionAudio: "jet_ig_dragon",  loopAudio: "jet_lp_dragon",  sputterAudio: "jet_sp_dragon",  unlockHint: "Season finale")
    ]

    func entry(id: String) -> JetpackCatalogEntry {
        entries.first(where: { $0.id == id }) ?? entries[0]
    }
}
