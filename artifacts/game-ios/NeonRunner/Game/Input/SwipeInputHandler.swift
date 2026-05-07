//
//  SwipeInputHandler.swift
//
//  Buffered swipe + tap input. The runtime calls beginTick / endTick around the
//  simulation step so input is consumed atomically per tick, no lost swipes.
//

import Foundation
import UIKit

public enum SwipeDirection: Sendable, Hashable { case left, right, up, down }

public struct JetpackInput: Sendable, Equatable {
    public var thrusting: Bool
    public var consumableArmed: Bool
    public init(thrusting: Bool, consumableArmed: Bool) {
        self.thrusting = thrusting
        self.consumableArmed = consumableArmed
    }
    public static let idle = JetpackInput(thrusting: false, consumableArmed: false)
}

@MainActor
final class SwipeInputHandler {
    private(set) var consumedSwipes: [SwipeDirection] = []
    private(set) var jetpackInput: JetpackInput = .idle

    private var pendingSwipes: [SwipeDirection] = []
    private var thrustPressed: Bool = false
    private var consumableTap: Bool = false
    private let settings: SettingsStore
    private var sensitivityFactor: Float

    init(settings: SettingsStore) {
        self.settings = settings
        self.sensitivityFactor = settings.swipeSensitivityFactor
    }

    /// Called by the runtime each fixed-step tick.
    func beginTick() {
        consumedSwipes = pendingSwipes
        pendingSwipes.removeAll(keepingCapacity: true)
        jetpackInput = JetpackInput(thrusting: thrustPressed, consumableArmed: consumableTap)
        consumableTap = false
        sensitivityFactor = settings.swipeSensitivityFactor
    }

    func endTick() { /* placeholder */ }

    // MARK: - UIKit gesture entry points

    /// Called by `GameInteractionView` (UIView wrapping the SCNView) on pan ends.
    func handlePan(translation: CGSize, velocity: CGSize) {
        // Determine dominant axis with a sensitivity-adjusted minimum delta.
        let minDelta: CGFloat = CGFloat(60.0 / max(0.5, sensitivityFactor))
        let absX = abs(translation.width)
        let absY = abs(translation.height)
        guard max(absX, absY) >= minDelta else { return }
        if absX > absY {
            pendingSwipes.append(translation.width > 0 ? .right : .left)
        } else {
            pendingSwipes.append(translation.height > 0 ? .down : .up)
        }
    }

    /// Programmatic swipe, e.g. from the cheat console or unit tests.
    func handleSwipe(_ direction: SwipeDirection) {
        pendingSwipes.append(direction)
    }

    /// Tap-and-hold, used to drive the jetpack thrust.
    func setJetpackThrust(_ active: Bool) {
        thrustPressed = active
    }

    func handleTwoFingerTap() {
        consumableTap = true
    }
}
