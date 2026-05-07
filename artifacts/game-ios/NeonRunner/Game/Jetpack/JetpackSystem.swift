//
//  JetpackSystem.swift
//
//  The headline mechanic. Owns the fuel timer, the choreographed ignition
//  sequence, and the in-flight controls.
//
//  See docs/06-jetpack.md for design intent.
//

import Foundation
import SceneKit

public enum JetpackState: Equatable, Sendable {
    case inactive
    case igniting(remaining: TimeInterval)
    case flying
    case sputtering(remaining: TimeInterval)
    case landing(remaining: TimeInterval)
}

@MainActor
final class JetpackSystem {

    private let catalog: JetpackCatalog
    private let bus: EventBus
    private let scene: SceneRendererBridge
    private var subs: [AnyCancellableEventToken] = []

    private(set) var state: JetpackState = .inactive
    private(set) var equipped: JetpackCatalogEntry
    private(set) var fuelRemaining: TimeInterval = 0
    private(set) var totalFlightSeconds: TimeInterval = 0

    var isFlying: Bool {
        if case .flying = state { return true } else { return false }
    }

    init(catalog: JetpackCatalog, bus: EventBus, scene: SceneRendererBridge) {
        self.catalog = catalog
        self.bus = bus
        self.scene = scene
        self.equipped = catalog.entry(id: "jp_basic_v1")

        subs.append(bus.subscribe { [weak self] event in
            guard let self else { return }
            if case .jetpackCollected(let id) = event {
                self.equip(catalogId: id)
                self.ignite()
            }
        })
    }

    func equip(catalogId: String) {
        equipped = catalog.entry(id: catalogId)
    }

    func reset() {
        state = .inactive
        fuelRemaining = 0
        totalFlightSeconds = 0
    }

    /// Triggered by collecting a jetpack pickup or by cheat console.
    func ignite() {
        guard case .inactive = state else { return }
        fuelRemaining = equipped.fuelCapacity
        state = .igniting(remaining: 0.30)
        bus.publish(.jetpackIgnited(catalogId: equipped.id))
    }

    func tick(dt: TimeInterval, time: GameTime, input: JetpackInput, player: PlayerController) {
        switch state {
        case .inactive:
            // Player follows ground gravity (handled in PlayerController)
            return

        case .igniting(let r):
            let next = r - dt
            if next <= 0 {
                state = .flying
                player.setVerticalMotionFromJetpack(velocity: 1.5, dt: dt, minY: 1.6, maxY: 18)
            } else {
                state = .igniting(remaining: next)
                player.setVerticalMotionFromJetpack(velocity: 4.0, dt: dt, minY: 1.6, maxY: 18)
            }

        case .flying:
            // Drain fuel.
            fuelRemaining -= dt * Double(equipped.drainMultiplier)
            totalFlightSeconds += dt

            // Apply input.
            let target: Float = input.thrusting ? equipped.climbRate : -equipped.descendRate
            player.setVerticalMotionFromJetpack(velocity: target, dt: dt, minY: 1.6, maxY: 18)

            // Low fuel warning at 1.0 s threshold.
            if fuelRemaining <= 1.0 {
                bus.publish(.jetpackFuelLow)
            }
            // Out of fuel.
            if fuelRemaining <= 0 {
                fuelRemaining = 0
                state = .sputtering(remaining: 0.6)
                bus.publish(.jetpackSputter)
            }

        case .sputtering(let r):
            let next = r - dt
            if next <= 0 {
                state = .landing(remaining: 0.4)
            } else {
                state = .sputtering(remaining: next)
            }
            // Glide downward gently
            player.setVerticalMotionFromJetpack(velocity: -2.0, dt: dt, minY: 1.6, maxY: 18)

        case .landing(let r):
            let next = r - dt
            if next <= 0 {
                state = .inactive
                bus.publish(.jetpackLanded(durationFlown: totalFlightSeconds, distanceFlown: player.distanceTraveledMeters, coinsCollected: 0))
            } else {
                state = .landing(remaining: next)
            }
            player.returnToGround(dt: dt)
        }
    }

    func damage() {
        guard case .flying = state else { return }
        fuelRemaining = max(0, fuelRemaining - 1.5)
    }
}
