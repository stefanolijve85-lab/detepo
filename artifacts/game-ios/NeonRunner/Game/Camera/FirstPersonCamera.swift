//
//  FirstPersonCamera.swift
//
//  Owns the SCNNode for the camera + the head-bob driver + FOV kicks.
//
//  Camera deltas are *added* to player.position so the rig is always anchored
//  to the kinematic player. This keeps camera behavior deterministic and
//  decouples camera polish from collision logic.
//

import Foundation
import SceneKit
import simd

@MainActor
final class FirstPersonCamera {
    private let scene: SceneRendererBridge
    private let player: PlayerController
    private let settings: SettingsStore

    private var headBob = HeadBob()
    private var fovKick = FOVKick()

    private(set) var fov: Float = 88
    private(set) var roll: Float = 0      // degrees
    private(set) var pitch: Float = 0     // degrees

    init(scene: SceneRendererBridge, player: PlayerController, settings: SettingsStore) {
        self.scene = scene
        self.player = player
        self.settings = settings
    }

    func reset() {
        headBob = HeadBob()
        fovKick.reset()
        fov = 88
        roll = 0
        pitch = 0
        scene.setCameraFOV(fov)
    }

    func tick(dt: TimeInterval, time: GameTime, player: PlayerController, jetpack: JetpackSystem) {
        let speedNormalized = min(1.0, player.currentSpeed / 28.0)
        headBob.advance(dt: dt, speedNormalized: speedNormalized, sliding: player.isSliding)
        fovKick.tick(dt: dt, jetpackActive: jetpack.isFlying, slowMo: false)

        let (bobOffset, tilt) = settings.reducedMotion ? (Vec3.zero, Float(0)) : headBob.sample()

        // Pitch slightly up while flying for a heroic feel.
        pitch = jetpack.isFlying ? 4.0 : (player.isSliding ? -3.0 : 0)
        roll = settings.reducedMotion ? 0 : tilt

        fov = fovKick.currentFOV(base: 88)

        scene.setCameraTransform(
            position: player.position + bobOffset + Vec3(0, 0.05, 0),
            yaw: 0,
            pitchDegrees: pitch,
            rollDegrees: roll
        )
        scene.setCameraFOV(fov)
        scene.setMotionBlurStrength(0.65 * speedNormalized + (jetpack.isFlying ? 0.25 : 0))
        scene.setVignetteStrength(0.20 + 0.30 * speedNormalized)
    }

    func cinematicReviveZoom() {
        fovKick.kickReviveCinematic()
    }
}

@MainActor
struct FOVKick {
    private var current: Float = 0     // additive to base
    private var target: Float = 0
    private var spring: Float = 6.0    // higher = snappier

    mutating func reset() { current = 0; target = 0 }

    mutating func tick(dt: TimeInterval, jetpackActive: Bool, slowMo: Bool) {
        target = jetpackActive ? 8.0 : (slowMo ? -6.0 : 0.0)
        let alpha = Float(1.0 - exp(-spring * dt))
        current += (target - current) * alpha
    }

    func currentFOV(base: Float) -> Float { base + current }

    mutating func kickReviveCinematic() {
        current = -10
        target = 0
        spring = 3.0
    }
}
