//
//  ProfileStore.swift
//
//  Player profile + inventory + missions + battle pass progress. Truth-source
//  for the UI menus.
//

import Foundation
import SwiftUI

public struct PlayerMission: Identifiable, Hashable, Sendable, Codable {
    public let id: String
    public let description: String
    public let target: Int
    public var progress: Int
    public let rewardBytes: Int
    public let rewardBPxp: Int
    public var isClaimed: Bool
    public var isComplete: Bool { progress >= target }
}

public struct PlayerProfileSnapshot: Hashable, Sendable, Codable {
    public var playerId: String
    public var displayName: String
    public var country: String
    public var jwt: String?
    public var bytes: Int
    public var chips: Int
    public var xp: Int
    public var level: Int
    public var bestScore: Int
    public var previousBestScore: Int?
    public var battlePassXP: Int
    public var battlePassTier: Int
    public var battlePassPremium: Bool
    public var streakDays: Int
    public var lastFriendsRank: Int?
    public var inventory: [InventoryItem]
    public var dailyMissions: [PlayerMission]
    public var weeklyMissions: [PlayerMission]
    public var missionsAssignedToday: Int { dailyMissions.count }
    public var missionsCompletedToday: Int { dailyMissions.filter { $0.isClaimed }.count }
}

public struct InventoryItem: Hashable, Sendable, Codable, Identifiable {
    public var id: String { catalogId }
    public let catalogId: String
    public let kind: String       // jetpack | glove | trail | taunt
    public let rarity: JetpackRarity
    public var level: Int
    public var equipped: Bool
}

public enum CurrencySource: String, Sendable, Codable {
    case run, mission, dailyLogin, ad, purchase, gift, battlepass
}

@Observable
@MainActor
final class ProfileStore {
    private(set) var profile: PlayerProfileSnapshot

    private init(profile: PlayerProfileSnapshot) {
        self.profile = profile
    }

    static func live() -> ProfileStore {
        let raw = UserDefaults.standard.data(forKey: "profile.snapshot")
        let profile = (try? raw.map { try JSONDecoder().decode(PlayerProfileSnapshot.self, from: $0) }) ?? .init() ?? Self.defaultProfile()
        return ProfileStore(profile: profile)
    }

    private static func defaultProfile() -> PlayerProfileSnapshot {
        PlayerProfileSnapshot(
            playerId: ULID().stringValue,
            displayName: "Runner",
            country: Locale.current.region?.identifier ?? "US",
            jwt: nil,
            bytes: 0,
            chips: 0,
            xp: 0,
            level: 1,
            bestScore: 0,
            previousBestScore: nil,
            battlePassXP: 0,
            battlePassTier: 0,
            battlePassPremium: false,
            streakDays: 0,
            lastFriendsRank: nil,
            inventory: [
                InventoryItem(catalogId: "jp_basic_v1", kind: "jetpack", rarity: .common, level: 1, equipped: true)
            ],
            dailyMissions: [
                PlayerMission(id: "mn_distance_1500", description: "Run 1 500 m in a single run", target: 1500, progress: 0, rewardBytes: 500, rewardBPxp: 50, isClaimed: false),
                PlayerMission(id: "mn_combo_15", description: "Reach combo ×15", target: 15, progress: 0, rewardBytes: 700, rewardBPxp: 75, isClaimed: false),
                PlayerMission(id: "mn_jetpack_30s", description: "Fly 30 s in jetpack", target: 30, progress: 0, rewardBytes: 600, rewardBPxp: 60, isClaimed: false)
            ],
            weeklyMissions: []
        )
    }

    func loadFromDisk() async { /* loaded in `live()` */ }

    func tokenProvider() -> () -> String? {
        return { [weak self] in self?.profile.jwt }
    }

    func save() async {
        if let data = try? JSONEncoder().encode(profile) {
            UserDefaults.standard.set(data, forKey: "profile.snapshot")
        }
    }

    // MARK: - Mutations

    func applyRunRewards(summary: RunSummary) async {
        let earnedBytes = max(0, summary.scoreClient / 50)
        profile.bytes += earnedBytes
        profile.xp += max(0, summary.scoreClient / 100)
        profile.battlePassXP += max(0, summary.scoreClient / 80)
        profile.battlePassTier = profile.battlePassXP / 1000
        if summary.scoreClient > profile.bestScore {
            profile.previousBestScore = profile.bestScore
            profile.bestScore = summary.scoreClient
        }
        await save()
    }

    func updateMissionProgress(metrics: [String: Int], bus: EventBus) async {
        for (i, var mission) in profile.dailyMissions.enumerated() {
            let metricKey = mission.id.replacingOccurrences(of: "mn_", with: "").components(separatedBy: "_").first ?? ""
            // Crude mapping; real engine uses templated rules.
            let progress = metrics[metricKey] ?? 0
            mission.progress = max(mission.progress, progress)
            profile.dailyMissions[i] = mission
            if mission.isComplete && !mission.isClaimed {
                bus.publish(.missionComplete(missionId: mission.id))
            }
        }
        await save()
    }

    func claimMission(_ mission: PlayerMission) async {
        guard let i = profile.dailyMissions.firstIndex(where: { $0.id == mission.id }) else { return }
        guard profile.dailyMissions[i].isComplete && !profile.dailyMissions[i].isClaimed else { return }
        profile.dailyMissions[i].isClaimed = true
        profile.bytes += mission.rewardBytes
        profile.battlePassXP += mission.rewardBPxp
        await save()
    }

    func grant(bytes: Int, chips: Int, source: CurrencySource) async {
        profile.bytes += bytes
        profile.chips += chips
        await save()
    }

    func spend(chips: Int) async {
        profile.chips = max(0, profile.chips - chips)
        await save()
    }

    func claimAllBattlePassRewards() async {
        // TODO: walk tiers + atomic claim via backend
        await save()
    }

    func exportData() async {
        // GDPR data export — write JSON to share-sheet URL.
    }

    func deleteAccount() async {
        // Hard delete; backend cascades + clears local state.
    }
}

private extension Optional where Wrapped == PlayerProfileSnapshot {
    init() { self = .none }
}
