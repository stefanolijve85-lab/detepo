//
//  GameLoop.swift
//
//  Fixed-timestep simulation loop driven by CADisplayLink. We accumulate real-time
//  deltas and step the simulation in 1/60 increments, so behavior is independent
//  of refresh rate. Render-side interpolation is implicit: SceneKit transforms
//  are written from the latest sub-step.
//
//  This pattern is the standard "Fix Your Timestep!" by Glenn Fiedler.
//

import Foundation
import QuartzCore

@MainActor
final class GameLoop {

    /// 60 Hz fixed simulation step. ProMotion devices get smoother *render* through
    /// SceneKit's display link without changing the simulation cadence.
    static let fixedStep: TimeInterval = 1.0 / 60.0

    /// Hard cap on accumulated dt to avoid the "spiral of death" after a stall.
    private static let maxAccumulator: TimeInterval = 0.25

    private let clock: GameClock
    private let tick: (TimeInterval, GameTime) -> Void
    private var displayLink: CADisplayLink?
    private var lastTimestamp: CFTimeInterval = 0
    private var accumulator: TimeInterval = 0
    private(set) var isRunning: Bool = false
    private var isSuspended: Bool = false

    init(clock: GameClock, tick: @escaping (TimeInterval, GameTime) -> Void) {
        self.clock = clock
        self.tick = tick
    }

    func start() {
        guard !isRunning else { return }
        isRunning = true
        isSuspended = false
        lastTimestamp = CACurrentMediaTime()
        accumulator = 0
        let link = CADisplayLink(target: DisplayLinkTrampoline(self), selector: #selector(DisplayLinkTrampoline.fire(_:)))
        // 120Hz on ProMotion, fall back to 60.
        link.preferredFrameRateRange = CAFrameRateRange(minimum: 60, maximum: 120, preferred: 120)
        link.add(to: .main, forMode: .common)
        displayLink = link
    }

    func suspend() {
        isSuspended = true
    }

    func resume() {
        guard isRunning else { return }
        isSuspended = false
        // Reset timestamp so the post-resume frame doesn't accumulate the gap.
        lastTimestamp = CACurrentMediaTime()
        accumulator = 0
    }

    func stop() {
        displayLink?.invalidate()
        displayLink = nil
        isRunning = false
        isSuspended = false
    }

    fileprivate func onDisplayLink(_ link: CADisplayLink) {
        guard isRunning, !isSuspended else { return }
        let timestamp = link.timestamp
        let realDelta = max(0, timestamp - lastTimestamp)
        lastTimestamp = timestamp

        accumulator += min(realDelta, GameLoop.maxAccumulator)
        let scaled = clock.advance(realDelta: accumulator)
        // Fixed-step inner loop. Time scale (slow-mo) modifies the *simulation*
        // delta only, real-time stays real.
        var simAccumulator = scaled
        while simAccumulator >= GameLoop.fixedStep {
            tick(GameLoop.fixedStep, clock.now)
            simAccumulator -= GameLoop.fixedStep
        }
        // Keep the unconsumed remainder for the next frame.
        accumulator = simAccumulator / max(0.0001, Double(clock.timeScale))
    }
}

/// CADisplayLink expects an `@objc` target. This trampoline isolates the
/// Objective-C selector requirement from our Swift-only loop type.
private final class DisplayLinkTrampoline: NSObject {
    weak var owner: GameLoop?
    init(_ owner: GameLoop) { self.owner = owner }
    @objc func fire(_ link: CADisplayLink) {
        Task { @MainActor [weak self] in
            self?.owner?.onDisplayLink(link)
        }
    }
}
