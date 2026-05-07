//
//  GameTime.swift
//
//  Central time source for the simulation. We separate *real* time (CACurrentMediaTime)
//  from *simulation* time so we can pause, slow-mo, and replay deterministically.
//

import Foundation
import QuartzCore

/// A monotonically increasing simulation timestamp, in seconds.
public struct GameTime: Hashable, Comparable, Sendable {
    public let seconds: TimeInterval
    public init(_ seconds: TimeInterval) { self.seconds = seconds }
    public static let zero = GameTime(0)
    public static func < (lhs: GameTime, rhs: GameTime) -> Bool { lhs.seconds < rhs.seconds }
    public static func + (lhs: GameTime, rhs: TimeInterval) -> GameTime { .init(lhs.seconds + rhs) }
    public static func - (lhs: GameTime, rhs: GameTime) -> TimeInterval { lhs.seconds - rhs.seconds }
}

@MainActor
final class GameClock {
    private(set) var now: GameTime = .zero
    private(set) var realTime: TimeInterval = CACurrentMediaTime()
    /// Slow-mo factor. 1.0 = real time. 0.6 = 60 % speed.
    var timeScale: Float = 1.0
    /// True while the loop is paused (menus, suspension).
    private(set) var isPaused: Bool = false

    /// Advances the clock based on a real-time delta and returns the simulation delta.
    @discardableResult
    func advance(realDelta: TimeInterval) -> TimeInterval {
        guard !isPaused else { return 0 }
        let dt = realDelta * Double(timeScale)
        now = now + dt
        realTime += realDelta
        return dt
    }

    func pause() { isPaused = true }
    func resume() { isPaused = false }

    /// Resets the clock for a fresh run. Time-scale is reset to 1.0.
    func reset() {
        now = .zero
        realTime = CACurrentMediaTime()
        timeScale = 1.0
        isPaused = false
    }
}
