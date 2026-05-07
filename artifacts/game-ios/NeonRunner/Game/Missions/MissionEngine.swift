//
//  MissionEngine.swift
//
//  Listens to the event bus + the run summary and updates daily/weekly mission
//  progress. Persistence is delegated to ProfileStore so the engine stays pure.
//

import Foundation

@MainActor
final class MissionEngine {

    private let profileStore: ProfileStore
    private let bus: EventBus
    private var subs: [AnyCancellableEventToken] = []

    private var perRunCounters: [String: Int] = [:]
    private var slideMetersThisRun: Float = 0
    private var jetpackSecondsThisRun: TimeInterval = 0

    init(profileStore: ProfileStore, bus: EventBus) {
        self.profileStore = profileStore
        self.bus = bus
        wire()
    }

    private func wire() {
        subs.append(bus.subscribe { [weak self] event in
            self?.handle(event)
        })
    }

    func beginRun() {
        perRunCounters.removeAll()
        slideMetersThisRun = 0
        jetpackSecondsThisRun = 0
    }

    func tick() { /* placeholder for time-based aggregation */ }

    private func handle(_ event: GameEvent) {
        switch event {
        case .coinCollected(let amount, _):
            increment("coins", by: amount)
        case .nearMiss:
            increment("near_miss", by: 1)
        case .comboTierUp(let tier):
            updateMax("combo_tier", to: tier)
        case .jetpackLanded(let dur, _, _):
            jetpackSecondsThisRun += dur
            increment("jetpack_time", by: Int(dur))
        case .runEnded(_, let summary):
            applyRunResults(summary: summary)
        default: break
        }
    }

    private func increment(_ key: String, by amount: Int) {
        perRunCounters[key, default: 0] += amount
    }

    private func updateMax(_ key: String, to value: Int) {
        perRunCounters[key] = max(perRunCounters[key, default: 0], value)
    }

    private func applyRunResults(summary: RunSummary) {
        // Translate counters into mission progress events for active missions.
        let metrics: [String: Int] = [
            "coins":         perRunCounters["coins", default: 0],
            "distance_m":    summary.distanceCm / 100,
            "combo_tier":    perRunCounters["combo_tier", default: 0],
            "near_miss":     perRunCounters["near_miss", default: 0],
            "jetpack_time":  perRunCounters["jetpack_time", default: 0],
            "slide_distance": Int(slideMetersThisRun),
        ]

        Task { @MainActor in
            await profileStore.updateMissionProgress(metrics: metrics, bus: bus)
        }
    }
}
