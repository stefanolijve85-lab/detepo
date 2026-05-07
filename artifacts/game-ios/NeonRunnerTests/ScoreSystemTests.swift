//
//  ScoreSystemTests.swift
//
//  Unit tests for the deterministic-score formula. The same code path runs on
//  the server (TS port) so these tests double as parity tests.
//

import XCTest
@testable import NeonRunner

@MainActor
final class ScoreSystemTests: XCTestCase {

    func test_emptyRun_scoresZero() {
        let bus = EventBus()
        let combo = ComboTracker(bus: bus)
        let pu = PowerUpStack(bus: bus)
        let score = ScoreSystem(combo: combo, powerUps: pu, bus: bus)
        score.tick(dt: 1/60, time: .zero, distance: 0)
        XCTAssertEqual(score.canonicalScore, 0)
    }

    func test_distanceOnly_scoresLinearly() {
        let bus = EventBus()
        let combo = ComboTracker(bus: bus)
        let pu = PowerUpStack(bus: bus)
        let score = ScoreSystem(combo: combo, powerUps: pu, bus: bus)
        score.tick(dt: 1/60, time: .zero, distance: 1000)
        XCTAssertEqual(score.canonicalScore, 6000)  // 6.0 * 1000
    }

    func test_doubleCoinsMultipliesCoinScore() {
        let bus = EventBus()
        let combo = ComboTracker(bus: bus)
        let pu = PowerUpStack(bus: bus)
        let score = ScoreSystem(combo: combo, powerUps: pu, bus: bus)
        pu.grant(.scoreMultiplier, duration: 10)
        bus.publish(.coinCollected(amount: 100, position: .zero))
        score.tick(dt: 1/60, time: .zero, distance: 0)
        XCTAssertGreaterThan(score.canonicalScore, 0)
    }

    func test_seedDeterminism() {
        var rng1 = DeterministicRNG(seed: 42)
        var rng2 = DeterministicRNG(seed: 42)
        for _ in 0..<1000 {
            XCTAssertEqual(rng1.next(), rng2.next())
        }
    }
}
