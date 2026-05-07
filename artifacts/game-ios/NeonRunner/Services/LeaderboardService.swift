//
//  LeaderboardService.swift
//

import Foundation

public struct RunSubmissionResponse: Decodable, Sendable {
    public let runId: String
    public let scoreCanonical: Int
    public let rankGlobal: Int?
    public let rankCountry: Int?
    public let rewards: [RunReward]
}

public struct RunReward: Decodable, Hashable, Sendable {
    public let kind: String
    public let amount: Int
    public let catalogId: String?
}

public struct LeaderboardResult: Sendable {
    public let entries: [LeaderboardEntry]
    public let myRank: Int?
}

@MainActor
final class LeaderboardService {
    private let backend: BackendClient
    private var cache: [String: (timestamp: Date, value: LeaderboardResult)] = [:]
    private let ttl: TimeInterval = 10

    init(backend: BackendClient) {
        self.backend = backend
    }

    func topAndMe(scope: LeaderboardScope) async throws -> LeaderboardResult {
        let key = scopeKey(scope)
        if let hit = cache[key], Date().timeIntervalSince(hit.timestamp) < ttl {
            return hit.value
        }
        let path = scopePath(scope)
        let dto: LeaderboardDTO = try await backend.get(path, query: [URLQueryItem(name: "me", value: "1")])
        let entries = dto.entries.enumerated().map { i, e in
            LeaderboardEntry(rank: e.rank ?? i + 1, playerId: e.playerId, displayName: e.displayName, score: e.score, country: e.country, equippedJetpackId: e.equippedJetpackId)
        }
        let result = LeaderboardResult(entries: entries, myRank: dto.myRank)
        cache[key] = (Date(), result)
        return result
    }

    @discardableResult
    func submit(run: RunSummary) async throws -> RunSubmissionResponse {
        let body = RunSubmissionDTO(
            id: run.id,
            seed: String(run.seed, radix: 16),
            startedAt: run.startedAt,
            endedAt: run.endedAt,
            distanceCm: run.distanceCm,
            coins: run.coins,
            score: run.scoreClient,
            comboMax: run.comboMax,
            nearMisses: run.nearMisses,
            causeOfDeath: run.causeOfDeath,
            biomePath: run.biomePath,
            jetpackTimeMs: run.jetpackTimeMs,
            clientVersion: run.clientVersion,
            device: run.deviceModel,
            powerUpsUsed: run.powerUpsUsed.mapValues { $0 }
        )
        return try await backend.post("/api/game/v1/runs", body: body, idempotencyKey: run.id)
    }

    // MARK: - Helpers

    private func scopeKey(_ s: LeaderboardScope) -> String {
        switch s {
        case .global: "global"
        case .country(let iso): "country.\(iso)"
        case .friends: "friends"
        case .weekly: "weekly"
        case .season(let id): "season.\(id)"
        case .event(let id): "event.\(id)"
        }
    }

    private func scopePath(_ s: LeaderboardScope) -> String {
        switch s {
        case .global: "/api/game/v1/leaderboards/global"
        case .country(let iso): "/api/game/v1/leaderboards/country/\(iso)"
        case .friends: "/api/game/v1/leaderboards/friends"
        case .weekly: "/api/game/v1/leaderboards/weekly"
        case .season(let id): "/api/game/v1/leaderboards/season/\(id)"
        case .event(let id): "/api/game/v1/leaderboards/event/\(id)"
        }
    }
}

private struct LeaderboardDTO: Decodable {
    let entries: [Entry]
    let myRank: Int?
    struct Entry: Decodable {
        let rank: Int?
        let playerId: String
        let displayName: String
        let score: Int
        let country: String?
        let equippedJetpackId: String?
    }
}

private struct RunSubmissionDTO: Encodable {
    let id: String
    let seed: String
    let startedAt: Date
    let endedAt: Date
    let distanceCm: Int
    let coins: Int
    let score: Int
    let comboMax: Int
    let nearMisses: Int
    let causeOfDeath: DeathCause
    let biomePath: [BiomeID]
    let jetpackTimeMs: Int
    let clientVersion: String
    let device: String
    let powerUpsUsed: [PowerUpKind: Int]
}
