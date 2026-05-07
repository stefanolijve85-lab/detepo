//
//  ComboTracker.swift
//
//  A combo accumulates from any "skill" event: near miss, coin pickup, perfect
//  slide, perfect jump, jetpack barrel-roll. Each event refills the combo
//  window. Window decays linearly; if it hits zero, the combo breaks.
//
//  Tier mapping is logarithmic so reaching x10 vs x30 feels meaningfully
//  different but isn't impossible.
//

import Foundation

@MainActor
final class ComboTracker {
    private let bus: EventBus
    private var subs: [AnyCancellableEventToken] = []

    private(set) var currentCount: Int = 0     // raw events
    private(set) var tier: Int = 0
    private(set) var tierMax: Int = 0
    private(set) var multiplier: Double = 1.0
    private(set) var timeFraction: Double = 0  // remaining window 0..1

    private var windowRemaining: TimeInterval = 0
    private let windowAtFloorTier: TimeInterval = 4.0

    init(bus: EventBus) {
        self.bus = bus
        wire()
    }

    private func wire() {
        subs.append(bus.subscribe { [weak self] event in
            guard let self else { return }
            switch event {
            case .nearMiss:        self.bumpCombo(by: 1)
            case .coinCollected:   self.bumpCombo(by: 1)
            case .jetpackIgnited:  self.bumpCombo(by: 5)
            case .crashed:         self.breakCombo()
            default: break
            }
        })
    }

    func reset() {
        currentCount = 0
        tier = 0
        tierMax = 0
        multiplier = 1.0
        timeFraction = 0
        windowRemaining = 0
    }

    func tick(dt: TimeInterval, time: GameTime) {
        if windowRemaining > 0 {
            windowRemaining = max(0, windowRemaining - dt)
            timeFraction = windowRemaining / windowAtFloorTier
            if windowRemaining <= 0 {
                breakCombo()
            }
        }
    }

    func bumpCombo(by amount: Int) {
        currentCount += amount
        let newTier = max(1, Int(log2(Double(currentCount + 1))))
        if newTier > tier {
            tier = newTier
            tierMax = max(tierMax, tier)
            multiplier = 1.0 + 0.1 * Double(tier)
            bus.publish(.comboTierUp(tier: tier))
        }
        windowRemaining = windowAtFloorTier
    }

    func breakCombo() {
        guard tier > 0 else { return }
        let prev = tier
        tier = 0
        currentCount = 0
        multiplier = 1.0
        timeFraction = 0
        windowRemaining = 0
        bus.publish(.comboBroken(previousTier: prev))
    }

    /// Read by ScoreSystem each frame.
    func frameMultiplier() -> Float { Float(multiplier) }
}
