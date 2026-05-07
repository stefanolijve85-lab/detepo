//
//  SceneRendererBridge.swift
//
//  Thin bridge between gameplay systems and the SCNScene / SCNView. Keeps
//  SceneKit-specific code in one place. UI hosts the SCNView via UIViewRepresentable.
//

import Foundation
import SceneKit
import UIKit

@MainActor
final class SceneRendererBridge {
    let scene: SCNScene = SCNScene()
    private let cameraNode: SCNNode
    private let camera: SCNCamera
    private let playerRoot: SCNNode
    private let chunkRoot: SCNNode
    private let lightingRoot: SCNNode

    private var motionBlurStrength: Float = 0
    private var vignetteStrength: Float = 0.2

    init() {
        camera = SCNCamera()
        camera.fieldOfView = 88
        camera.zNear = 0.05
        camera.zFar = 800
        camera.wantsHDR = true
        camera.wantsExposureAdaptation = true
        camera.bloomIntensity = 1.4
        camera.bloomBlurRadius = 8.0
        camera.bloomThreshold = 0.85
        camera.motionBlurIntensity = 0.0
        camera.vignettingIntensity = 0.2
        camera.colorFringeStrength = 0.18

        cameraNode = SCNNode()
        cameraNode.camera = camera
        cameraNode.position = SCNVector3(0, PlayerController.baseHeight, 0)

        playerRoot = SCNNode()
        playerRoot.name = "player_root"

        chunkRoot = SCNNode()
        chunkRoot.name = "chunk_root"

        lightingRoot = SCNNode()

        scene.rootNode.addChildNode(playerRoot)
        scene.rootNode.addChildNode(chunkRoot)
        scene.rootNode.addChildNode(lightingRoot)
        scene.rootNode.addChildNode(cameraNode)

        installLighting()
        installAtmosphere()
    }

    // MARK: - Public API used by systems

    func setCameraTransform(position: Vec3, yaw: Float, pitchDegrees: Float, rollDegrees: Float) {
        cameraNode.position = SCNVector3(position.x, position.y, position.z)
        let pitch = pitchDegrees * .pi / 180
        let roll = rollDegrees * .pi / 180
        cameraNode.eulerAngles = SCNVector3(pitch, yaw, roll)
    }

    func setCameraFOV(_ fov: Float) {
        camera.fieldOfView = CGFloat(fov)
    }

    func setMotionBlurStrength(_ value: Float) {
        motionBlurStrength = value
        camera.motionBlurIntensity = CGFloat(value)
    }

    func setVignetteStrength(_ value: Float) {
        vignetteStrength = value
        camera.vignettingIntensity = CGFloat(value)
    }

    func setPlayerTransform(position: Vec3, height: Float) {
        playerRoot.position = SCNVector3(position.x, position.y - height, position.z)
    }

    func attachChunk(_ node: SCNNode) {
        chunkRoot.addChildNode(node)
    }

    func detachChunk(_ node: SCNNode) {
        node.removeFromParentNode()
    }

    func beginRun(biome: BiomeID) {
        applyBiomeAtmosphere(biome)
    }

    func tearDown() {
        chunkRoot.childNodes.forEach { $0.removeFromParentNode() }
    }

    // MARK: - Lighting

    private func installLighting() {
        // Key directional
        let key = SCNLight()
        key.type = .directional
        key.intensity = 800
        key.castsShadow = true
        key.shadowMode = .deferred
        key.shadowRadius = 6
        key.maximumShadowDistance = 80
        key.shadowMapSize = CGSize(width: 1024, height: 1024)
        let keyNode = SCNNode()
        keyNode.light = key
        keyNode.eulerAngles = SCNVector3(-Float.pi / 3, Float.pi / 6, 0)
        lightingRoot.addChildNode(keyNode)

        // Ambient with a cool tint
        let amb = SCNLight()
        amb.type = .ambient
        amb.intensity = 220
        amb.color = UIColor(red: 0.22, green: 0.28, blue: 0.45, alpha: 1)
        let ambNode = SCNNode()
        ambNode.light = amb
        lightingRoot.addChildNode(ambNode)
    }

    private func installAtmosphere() {
        scene.fogColor = UIColor(red: 0.04, green: 0.05, blue: 0.10, alpha: 1)
        scene.fogStartDistance = 60
        scene.fogEndDistance = 320
        scene.fogDensityExponent = 1.2
        scene.background.contents = UIColor(red: 0.02, green: 0.02, blue: 0.06, alpha: 1)
    }

    private func applyBiomeAtmosphere(_ biome: BiomeID) {
        switch biome {
        case .cyberCity:
            scene.fogColor = UIColor(red: 0.06, green: 0.04, blue: 0.16, alpha: 1)
        case .rooftop:
            scene.fogColor = UIColor(red: 0.10, green: 0.06, blue: 0.04, alpha: 1)
        case .subway:
            scene.fogColor = UIColor(red: 0.02, green: 0.04, blue: 0.10, alpha: 1)
        case .neonHighway:
            scene.fogColor = UIColor(red: 0.00, green: 0.02, blue: 0.12, alpha: 1)
        case .industrial:
            scene.fogColor = UIColor(red: 0.08, green: 0.04, blue: 0.06, alpha: 1)
        case .skyCity:
            scene.fogColor = UIColor(red: 0.06, green: 0.08, blue: 0.18, alpha: 1)
        }
    }
}
