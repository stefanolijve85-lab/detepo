//
//  PlayerController.swift
//
//  Kinematic player. We deliberately avoid SceneKit's rigid-body for the player
//  because we want frame-perfect lane snap and predictable jump arcs. The player
//  is a kinematic capsule whose position is driven by hand-tuned curves.
//

import Foundation
import simd
import SceneKit

@MainActor
final class PlayerController {

    // MARK: - Constants
    static let laneCount: Int = 3
    static let laneWidth: Float = 1.6           // meters
    static let baseHeight: Float = 1.7          // eye height
    static let crouchHeight: Float = 0.95       // slide
    static let jumpVelocity: Float = 7.4        // m/s
    static let gravity: Float = 16.0            // m/s² (heavier than real for snappy feel)
    static let gravityAir: Float = 9.0          // m/s² while jetpack flying
    static let laneSnapSpeed: Float = 18.0      // 1/s
    static let slideDuration: TimeInterval = 0.65

    // MARK: - State
    private(set) var position: Vec3 = .init(0, baseHeight, 0)
    private(set) var velocityY: Float = 0
    private(set) var currentSpeed: Float = 0
    private(set) var distanceTraveledMeters: Float = 0
    private(set) var lane: Int = 1            // 0..2
    private(set) var targetLane: Int = 1
    private(set) var isGrounded: Bool = true
    private(set) var isSliding: Bool = false
    private(set) var slideEndTime: GameTime = .zero
    private(set) var height: Float = baseHeight

    private let input: SwipeInputHandler
    private let scene: SceneRendererBridge

    init(input: SwipeInputHandler, scene: SceneRendererBridge) {
        self.input = input
        self.scene = scene
    }

    // MARK: - Lifecycle

    func reset() {
        position = .init(0, Self.baseHeight, 0)
        velocityY = 0
        currentSpeed = 0
        distanceTraveledMeters = 0
        lane = 1
        targetLane = 1
        isGrounded = true
        isSliding = false
        slideEndTime = .zero
        height = Self.baseHeight
        scene.setPlayerTransform(position: position, height: height)
    }

    // MARK: - Tick

    func tick(dt: TimeInterval, time: GameTime, targetSpeed: Float) {
        applyInput(time: time)
        applySpeedRamp(dt: dt, target: targetSpeed)
        applyVerticalMotion(dt: dt)
        applyHorizontalMotion(dt: dt)
        applySlideTimeout(time: time)
        scene.setPlayerTransform(position: position, height: height)
    }

    // MARK: - Input handling

    private func applyInput(time: GameTime) {
        for swipe in input.consumedSwipes {
            switch swipe {
            case .left:
                targetLane = max(0, targetLane - 1)
            case .right:
                targetLane = min(Self.laneCount - 1, targetLane + 1)
            case .up:
                if isGrounded {
                    velocityY = Self.jumpVelocity
                    isGrounded = false
                    isSliding = false
                    height = Self.baseHeight
                }
            case .down:
                if isGrounded && !isSliding {
                    isSliding = true
                    slideEndTime = time + Self.slideDuration
                    height = Self.crouchHeight
                }
            }
        }
    }

    // MARK: - Speed

    private func applySpeedRamp(dt: TimeInterval, target: Float) {
        // Critically damped approach to target speed.
        let alpha = Float(1.0 - exp(-3.0 * dt))
        currentSpeed += (target - currentSpeed) * alpha
        let dz = currentSpeed * Float(dt)
        position.z += dz
        distanceTraveledMeters += dz
    }

    // MARK: - Vertical

    private func applyVerticalMotion(dt: TimeInterval) {
        // Player only obeys gravity when not in jetpack mode (jetpack writes Y directly).
        // We default to ground gravity here; jetpack overrides next.
        if !isGrounded {
            velocityY -= Self.gravity * Float(dt)
            position.y += velocityY * Float(dt)
            if position.y <= height {
                position.y = height
                velocityY = 0
                isGrounded = true
            }
        } else {
            position.y = height
            velocityY = 0
        }
    }

    // MARK: - Lane snap

    private func applyHorizontalMotion(dt: TimeInterval) {
        let targetX = Float(targetLane - 1) * Self.laneWidth
        let alpha = Float(1.0 - exp(-Self.laneSnapSpeed * Float(dt)))
        position.x += (targetX - position.x) * alpha
        // Update integer lane when within snap tolerance to keep collision query cheap.
        if abs(position.x - targetX) < 0.05 {
            lane = targetLane
        }
    }

    // MARK: - Slide

    private func applySlideTimeout(time: GameTime) {
        guard isSliding, time >= slideEndTime else { return }
        isSliding = false
        height = Self.baseHeight
    }

    // MARK: - Jetpack hooks

    func setVerticalMotionFromJetpack(velocity: Float, dt: TimeInterval, minY: Float, maxY: Float) {
        // While jetpack is flying we override gravity-driven Y.
        velocityY = velocity
        position.y = max(minY, min(maxY, position.y + velocityY * Float(dt)))
        isGrounded = false
        isSliding = false
        height = Self.baseHeight
    }

    func returnToGround(dt: TimeInterval) {
        velocityY -= Self.gravity * Float(dt)
        position.y += velocityY * Float(dt)
        if position.y <= Self.baseHeight {
            position.y = Self.baseHeight
            velocityY = 0
            isGrounded = true
            height = Self.baseHeight
        }
    }

    // MARK: - Collision query

    /// Returns the AABB extent of the player capsule in local space.
    var collisionExtent: Vec3 {
        Vec3(0.4, height * 0.5, 0.45)
    }

    func reviveOffset() {
        // Pull player back 6 m on revive so the obstacle that killed them is behind.
        position.z = max(0, position.z - 6)
    }
}
