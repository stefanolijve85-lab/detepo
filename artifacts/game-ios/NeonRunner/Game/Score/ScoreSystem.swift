//
//  ScoreSystem.swift
//
//  Canonical score = the score the server will reproduce from the event log.
//  We keep formula here in *one place*. Any rebalance must happen in lockstep
//  with the backend simulator.
//
//      score = floor(
//          k_distance      * distance_meters
//        + k_coin          * coins
//        + k_chip          * chips * 10
//        + k_combo[tier]
//        + k_near_miss     * near_miss_count
//        + k_air           * air_time_seconds
//        + k_jetpack       * jetpack_time_seconds
//      ) * power_up_multiplier
//

import Foundation

@MainActor
final class ScoreSystem {

    static let kDistance: Double = 6.0       // per meter
    static let kCoin: Double = 5.0           // per coin
    static let kChip: Double = 50.0          // per chip
    static let kComboTier: Double = 50.0     // additive per achieved combo tier
    static let kNearMiss: Double = 25.0
    static let kAir: Double = 12.0
    static let kJetpack: Double = 18.0

    private let combo: ComboTracker
    private let powerUps: PowerUpStack
    private let bus: EventBus
    private var subs: [AnyCancellableEventToken] = []

    private(set) var canonicalScore: Int = 0
    private(set) var lastFrameDelta: Int = 0

    private var coins: Int = 0
    private var chips: Int = 0
    private var nearMisses: Int = 0
    private var airSeconds: TimeInterval = 0
    private var jetpackSeconds: TimeInterval = 0
    private var comboTierAchieved: Int = 0

    init(combo: ComboTracker, powerUps: PowerUpStack, bus: EventBus) {
        self.combo = combo
        self.powerUps = powerUps
        self.bus = bus
        wire()
    }

    private func wire() {
        subs.append(bus.subscribe { [weak self] event in
            guard let self else { return }
            switch event {
            case .coinCollected(let amount, _):
                self.coins += amount * powerUps.multiplierForCoins()
            case .chipCollected(let amount):
                self.chips += amount
            case .nearMiss:
                self.nearMisses += 1
            case .comboTierUp(let tier):
                self.comboTierAchieved = max(self.comboTierAchieved, tier)
            default: break
            }
        })
    }

    func reset() {
        canonicalScore = 0
        lastFrameDelta = 0
        coins = 0
        chips = 0
        nearMisses = 0
        airSeconds = 0
        jetpackSeconds = 0
        comboTierAchieved = 0
    }

    func tick(dt: TimeInterval, time: GameTime, distance: Float) {
        // Heuristic accumulators.
        // (Exact tracking lives in the simulator on submit; here we approximate.)
        let pow = powerUps.multiplierForScore() * combo.frameMultiplier()

        let raw =
            Self.kDistance      * Double(distance)
          + Self.kCoin          * Double(coins)
          + Self.kChip          * Double(chips * 10)
          + Self.kComboTier     * Double(comboTierAchieved)
          + Self.kNearMiss      * Double(nearMisses)
          + Self.kAir           * airSeconds
          + Self.kJetpack       * jetpackSeconds

        let next = Int((raw * Double(pow)).rounded(.down))
        lastFrameDelta = next - canonicalScore
        canonicalScore = next
    }
}
