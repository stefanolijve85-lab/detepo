//
//  Chunk.swift
//
//  A 30m world segment. Owns its SCNNode subtree and a list of obstacle + pickup
//  spawn slots that the spawner reads to schedule entities.
//

import Foundation
import SceneKit

@MainActor
final class Chunk {
    /// Where this chunk starts in world Z.
    private(set) var startZ: Float = 0
    private(set) var biome: BiomeID
    let length: Float
    let node: SCNNode

    /// 8 evenly-spaced spawn slots per chunk. The spawner picks lanes + types.
    private(set) var slots: [SpawnSlot] = []
    private(set) var pickupTrails: [PickupTrail] = []

    var endZ: Float { startZ + length }

    init(biome: BiomeID, length: Float) {
        self.biome = biome
        self.length = length
        self.node = SCNNode()
        node.name = "chunk"
        buildPersistentGeometry()
    }

    func reuse(startZ: Float, biome: BiomeID, rng: inout DeterministicRNG) {
        self.startZ = startZ
        self.biome = biome
        node.position = SCNVector3(0, 0, startZ)
        regenerateSpawnSlots(rng: &rng)
        regeneratePickupTrails(rng: &rng)
    }

    func recycle() {
        slots.removeAll(keepingCapacity: true)
        pickupTrails.removeAll(keepingCapacity: true)
    }

    // MARK: - Geometry

    private func buildPersistentGeometry() {
        // Floor (3 lanes wide)
        let floor = SCNBox(width: 6, height: 0.1, length: CGFloat(length), chamferRadius: 0)
        floor.firstMaterial?.diffuse.contents = UIColor(white: 0.06, alpha: 1)
        floor.firstMaterial?.specular.contents = UIColor(white: 0.4, alpha: 1)
        let floorNode = SCNNode(geometry: floor)
        floorNode.position = SCNVector3(0, 0, length / 2)
        node.addChildNode(floorNode)

        // Lane stripes (emissive guides)
        for laneIndex in 0..<2 {
            let stripe = SCNBox(width: 0.05, height: 0.11, length: CGFloat(length), chamferRadius: 0)
            stripe.firstMaterial?.emission.contents = UIColor(red: 0, green: 0.85, blue: 1, alpha: 1)
            stripe.firstMaterial?.diffuse.contents = UIColor.black
            let n = SCNNode(geometry: stripe)
            n.position = SCNVector3(Float(laneIndex - 1) * PlayerController.laneWidth + PlayerController.laneWidth / 2,
                                    0.06,
                                    Float(length) / 2)
            node.addChildNode(n)
        }

        // Skyline panels alternating left + right (decorative, no collision)
        for i in 0..<6 {
            let z = Float(i) * (length / 6) + 2.5
            addSkylinePanel(side: i % 2 == 0 ? -1 : 1, z: z)
        }
    }

    private func addSkylinePanel(side: Float, z: Float) {
        let panel = SCNBox(width: 1.2, height: 6.0, length: 4.0, chamferRadius: 0.1)
        panel.firstMaterial?.diffuse.contents = UIColor(white: 0.04, alpha: 1)
        panel.firstMaterial?.emission.contents = UIColor(red: 1, green: 0.18, blue: 0.49, alpha: 0.4)
        let n = SCNNode(geometry: panel)
        n.position = SCNVector3(side * 4.5, 3.0, z)
        node.addChildNode(n)
    }

    // MARK: - Spawn slot generation

    private func regenerateSpawnSlots(rng: inout DeterministicRNG) {
        slots.removeAll(keepingCapacity: true)
        let slotsPerChunk = 8
        for i in 0..<slotsPerChunk {
            let z = Float(i + 1) * (length / Float(slotsPerChunk + 1))
            let lane = Int(rng.next(below: UInt32(PlayerController.laneCount)))
            slots.append(SpawnSlot(localZ: z, lane: lane))
        }
    }

    private func regeneratePickupTrails(rng: inout DeterministicRNG) {
        pickupTrails.removeAll(keepingCapacity: true)
        // 2 pickup trails per chunk on average
        let trails = 1 + Int(rng.next(below: 3))
        for _ in 0..<trails {
            let lane = Int(rng.next(below: UInt32(PlayerController.laneCount)))
            let startLocalZ = rng.unitFloat() * (length - 6)
            let trailLength: Float = 6.0
            pickupTrails.append(PickupTrail(lane: lane, startLocalZ: startLocalZ, length: trailLength))
        }
    }
}

@MainActor
struct SpawnSlot {
    let localZ: Float
    let lane: Int
    var consumed: Bool = false
}

@MainActor
struct PickupTrail {
    let lane: Int
    let startLocalZ: Float
    let length: Float
    var consumed: Bool = false
}
