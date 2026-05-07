//
//  PowerUpStack.swift
//
//  Stackable timed power-ups. Each kind has a single timer; collecting the same
//  kind extends it (capped at 1.5× default duration). The HUD reads
//  `activeSnapshots` each frame.
//

import Foundation

@MainActor
final class PowerUpStack {
    private let bus: EventBus
    private var timers: [PowerUpKind: TimerState] = [:]
    private(set) var usedThisRun: [PowerUpKind: Int] = [:]
    private var subs: [AnyCancellableEventToken] = []

    init(bus: EventBus) {
        self.bus = bus
        subs.append(bus.subscribe { [weak self] event in
            guard let self else { return }
            if case .powerUpCollected(let kind, _) = event {
                self.grant(kind, duration: kind.defaultDuration)
            }
        })
    }

    func reset() {
        timers.removeAll()
        usedThisRun.removeAll()
    }

    func grant(_ kind: PowerUpKind, duration: TimeInterval) {
        let cap = kind.defaultDuration * 1.5
        let existing = timers[kind]?.remaining ?? 0
        let new = min(cap, existing + duration)
        timers[kind] = TimerState(remaining: new, total: max(new, kind.defaultDuration))
        usedThisRun[kind, default: 0] += 1
    }

    func tick(dt: TimeInterval, time: GameTime) {
        var expired: [PowerUpKind] = []
        for (kind, state) in timers {
            let next = state.remaining - dt
            if next <= 0 {
                expired.append(kind)
                timers.removeValue(forKey: kind)
            } else {
                timers[kind] = TimerState(remaining: next, total: state.total)
            }
        }
        for k in expired { bus.publish(.powerUpExpired(kind: k)) }
    }

    func isActive(_ kind: PowerUpKind) -> Bool { timers[kind] != nil }

    func multiplierForCoins() -> Int { isActive(.doubleCoins) ? 2 : 1 }
    func multiplierForScore() -> Float { isActive(.scoreMultiplier) ? 2.0 : 1.0 }
    func slowMoFactor() -> Float { isActive(.slowMotion) ? 0.6 : (isActive(.timeFreeze) ? 0.0 : 1.0) }
    func speedBoostFactor() -> Float { isActive(.speedBoost) ? 1.20 : 1.0 }

    var activeSnapshots: [PowerUpSnapshot] {
        timers.map { kind, state in
            PowerUpSnapshot(id: kind, kind: kind, durationRemaining: state.remaining, totalDuration: state.total)
        }.sorted { $0.kind.rawValue < $1.kind.rawValue }
    }

    private struct TimerState { let remaining: TimeInterval; let total: TimeInterval }
}
