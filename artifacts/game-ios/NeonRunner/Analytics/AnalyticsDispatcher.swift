//
//  AnalyticsDispatcher.swift
//
//  First-party analytics. Sample to vendor (Mixpanel) and forward unsampled
//  to our own warehouse via /telemetry. Events buffer up to 100 and flush
//  every 30 s or on app background.
//

import Foundation

public enum AnalyticsEvent: Sendable {
    case appLaunched(coldStart: Bool)
    case appBackgrounded
    case appForegrounded
    case runStarted(seed: UInt64, biome: BiomeID)
    case runEnded(summary: RunSummary)
    case runRevived(method: ReviveMethod, count: Int)
    case runSubmitted(rankGlobal: Int?)
    case runSubmitFailed(error: String)
    case equipJetpack(id: String)
    case decodeFailed(error: String)
    case iapCancelled(productId: String)
    case iapDelivered(productId: String)
    case iapFailed(productId: String, error: String)
    case missionClaimed(missionId: String)
    case bpTierClaimed(tier: Int, premium: Bool)
    case fromBus(GameEvent)

    var name: String {
        switch self {
        case .appLaunched: "app_launched"
        case .appBackgrounded: "app_backgrounded"
        case .appForegrounded: "app_foregrounded"
        case .runStarted: "run_started"
        case .runEnded: "run_ended"
        case .runRevived: "run_revived"
        case .runSubmitted: "run_submitted"
        case .runSubmitFailed: "run_submit_failed"
        case .equipJetpack: "equip_jetpack"
        case .decodeFailed: "decode_failed"
        case .iapCancelled: "iap_cancelled"
        case .iapDelivered: "iap_delivered"
        case .iapFailed: "iap_failed"
        case .missionClaimed: "mission_claimed"
        case .bpTierClaimed: "bp_tier_claimed"
        case .fromBus(let e): "bus_" + String(reflecting: e).split(separator: "(").first.map(String.init).map { $0.lowercased() } ?? "unknown"
        }
    }
}

@MainActor
final class AnalyticsDispatcher {
    static let shared: AnalyticsDispatcher = AnalyticsDispatcher.live()

    private var buffer: [PendingEvent] = []
    private var flushTask: Task<Void, Never>?

    private init() {}

    static func live() -> AnalyticsDispatcher {
        let d = AnalyticsDispatcher()
        d.startFlushTimer()
        return d
    }

    func log(_ event: AnalyticsEvent) {
        buffer.append(PendingEvent(name: event.name, ts: Date(), props: properties(for: event)))
        if buffer.count >= 100 { flushSoon() }
    }

    func logFromBus(_ event: GameEvent) {
        log(.fromBus(event))
    }

    private func startFlushTimer() {
        flushTask = Task { @MainActor [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 30_000_000_000)
                self?.flush()
            }
        }
    }

    func flushSoon() { Task { @MainActor in flush() } }

    func flush() {
        guard !buffer.isEmpty else { return }
        let batch = buffer
        buffer.removeAll(keepingCapacity: true)
        // Backend POST /telemetry — fire-and-forget; if it fails, swallow.
        Task.detached(priority: .background) {
            // Production: backend.postVoid("/api/game/v1/telemetry", body: batch)
            _ = batch
        }
    }

    private func properties(for event: AnalyticsEvent) -> [String: String] {
        switch event {
        case .runEnded(let summary):
            return [
                "score": String(summary.scoreClient),
                "distance_cm": String(summary.distanceCm),
                "coins": String(summary.coins),
                "combo_max": String(summary.comboMax),
                "near_miss": String(summary.nearMisses),
                "duration_ms": String(summary.durationMs),
                "cause": summary.causeOfDeath.rawValue
            ]
        case .runStarted(let seed, let biome):
            return ["seed": String(seed, radix: 16), "biome": biome.rawValue]
        case .runRevived(let m, let c):
            return ["method": m.rawValue, "count": String(c)]
        case .equipJetpack(let id), .iapCancelled(let id), .iapDelivered(let id):
            return ["product_id": id]
        case .iapFailed(let id, let err):
            return ["product_id": id, "error": err]
        default:
            return [:]
        }
    }
}

private struct PendingEvent { let name: String; let ts: Date; let props: [String: String] }
