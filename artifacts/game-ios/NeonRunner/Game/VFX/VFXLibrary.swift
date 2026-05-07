//
//  VFXLibrary.swift
//
//  Pooled SCNParticleSystems and screen overlays. Consumers call
//  `play(.coinSparkle, at: pos)` or `play(.nearMiss)` and never allocate.
//

import Foundation
import SceneKit

public enum VFXEffect: String, CaseIterable {
    case coinSparkle
    case nearMiss
    case jetpackTrail
    case jetpackIgnition
    case crashImpact
    case skyLaneEnter
}

@MainActor
final class VFXLibrary {

    private let scene: SceneRendererBridge
    private var pool: [VFXEffect: [SCNParticleSystem]] = [:]
    private var live: [LiveEffect] = []

    init(scene: SceneRendererBridge) {
        self.scene = scene
    }

    func reset() {
        for l in live {
            l.holderNode.removeFromParentNode()
            pool[l.effect, default: []].append(l.system)
        }
        live.removeAll()
    }

    func play(_ effect: VFXEffect, at position: Vec3 = .zero) {
        let system = pool[effect, default: []].popLast() ?? makeSystem(for: effect)
        let holder = SCNNode()
        holder.position = SCNVector3(position.x, position.y, position.z)
        holder.addParticleSystem(system)
        scene.scene.rootNode.addChildNode(holder)
        live.append(LiveEffect(effect: effect, system: system, holderNode: holder, ttl: effect.ttl))
    }

    func tick(dt: TimeInterval, time: GameTime) {
        var stillLive: [LiveEffect] = []
        for var entry in live {
            entry.ttl -= dt
            if entry.ttl <= 0 {
                entry.holderNode.removeFromParentNode()
                pool[entry.effect, default: []].append(entry.system)
                continue
            }
            stillLive.append(entry)
        }
        live = stillLive
    }

    private func makeSystem(for effect: VFXEffect) -> SCNParticleSystem {
        let system = SCNParticleSystem()
        system.birthRate = 200
        system.particleLifeSpan = 0.6
        system.particleSize = 0.04
        system.emissionDuration = 0.05
        system.warmupDuration = 0
        system.particleColor = .white
        system.blendMode = .additive
        switch effect {
        case .coinSparkle:
            system.birthRate = 80
            system.particleColor = UIColor(red: 1, green: 0.92, blue: 0.4, alpha: 1)
        case .nearMiss:
            system.birthRate = 220
            system.particleColor = UIColor(red: 1, green: 0.18, blue: 0.49, alpha: 1)
        case .jetpackTrail:
            system.birthRate = 600
            system.particleLifeSpan = 1.2
            system.emissionDuration = 9999
            system.particleColor = UIColor(red: 0.2, green: 0.8, blue: 1.0, alpha: 1)
        case .jetpackIgnition:
            system.birthRate = 1200
            system.particleSize = 0.08
            system.particleColor = UIColor(red: 1, green: 0.6, blue: 0.1, alpha: 1)
        case .crashImpact:
            system.birthRate = 800
            system.particleColor = UIColor(red: 1, green: 0.1, blue: 0.1, alpha: 1)
        case .skyLaneEnter:
            system.birthRate = 400
            system.particleColor = UIColor(white: 0.95, alpha: 1)
        }
        return system
    }

    private struct LiveEffect {
        let effect: VFXEffect
        let system: SCNParticleSystem
        let holderNode: SCNNode
        var ttl: TimeInterval
    }
}

extension VFXEffect {
    var ttl: TimeInterval {
        switch self {
        case .coinSparkle:     return 0.6
        case .nearMiss:        return 0.5
        case .jetpackTrail:    return 9999  // killed manually on jetpackLanded
        case .jetpackIgnition: return 0.4
        case .crashImpact:     return 1.0
        case .skyLaneEnter:    return 0.5
        }
    }
}
