//
//  ObstacleSpawner.swift
//
//  Walks the active chunks and decides what to spawn into each open slot,
//  based on the difficulty curve. Pure logic — actual SCNNode pooling lives in
//  ObstaclePool.
//
//  Telegraph rule: every spawn happens at least 1.0s ahead of the player so the
//  cue + audio fires before the player sees the obstacle. Distance =
//  speed * lead_time.
//

import Foundation
import SceneKit

@MainActor
final class ObstacleSpawner {

    private let world: ChunkStreamer
    private let difficulty: DifficultyCurve
    private let pool = ObstaclePool()
    private var rng = DeterministicRNG(seed: 0)
    private var nextObstacleId: UInt32 = 1
    private var live: [LiveObstacle] = []
    private(set) var nearMissCount: Int = 0

    init(world: ChunkStreamer, difficulty: DifficultyCurve) {
        self.world = world
        self.difficulty = difficulty
    }

    func reset(seed: UInt64) {
        rng = DeterministicRNG(seed: seed ^ 0xA5A55A5A5A5A5A5A)
        live.removeAll()
        nearMissCount = 0
        pool.recycleAll()
    }

    func tick(dt: TimeInterval, time: GameTime, player: PlayerController, jetpack: JetpackSystem) {
        // 1. Spawn from chunks ahead.
        for chunk in world.activeChunkSnapshots {
            for (i, slot) in chunk.slots.enumerated() where !slot.consumed {
                let worldZ = chunk.startZ + slot.localZ
                if worldZ - player.position.z < player.currentSpeed * 1.2 { continue }
                if rng.unitFloat() < spawnProbability() {
                    spawn(at: worldZ, lane: slot.lane, biome: chunk.biome)
                }
                chunk.slotsConsumed(at: i)
            }
        }

        // 2. Check collisions + near-miss windows.
        var stillLive: [LiveObstacle] = []
        for ob in live {
            if ob.worldZ + 4 < player.position.z {
                pool.recycle(ob)
                continue
            }
            // Collision
            let dz = ob.worldZ - player.position.z
            let inXY = abs(player.position.x - ob.x) < 0.6
            let bypass = obstacleBypass(player: player, jetpack: jetpack, archetype: ob.archetype)
            if abs(dz) < 0.7 && inXY && !bypass {
                NotificationCenter.default.postCrash(archetype: ob.archetype)
                pool.recycle(ob)
                continue
            }
            if dz > 0 && dz < 1.4 && inXY && bypass {
                if !ob.nearMissed {
                    let mut = ob.markedAsNearMissed()
                    nearMissCount += 1
                    NotificationCenter.default.postNearMiss(id: ob.id, distance: Float(dz))
                    stillLive.append(mut)
                    continue
                }
            }
            stillLive.append(ob)
        }
        live = stillLive
    }

    // MARK: - Spawn rules

    private func spawnProbability() -> Float {
        // 1.0 / 8 base; scale with density up to ~3/8.
        return 0.12 * difficulty.currentDensity
    }

    private func spawn(at worldZ: Float, lane: Int, biome: BiomeID) {
        let archetype = pickArchetype(biome: biome)
        let id = ObstacleID(nextObstacleId); nextObstacleId &+= 1
        let x = Float(lane - 1) * PlayerController.laneWidth
        let node = pool.acquire(archetype: archetype)
        node.position = SCNVector3(x, archetype.spawnY, worldZ)
        live.append(LiveObstacle(id: id, archetype: archetype, x: x, worldZ: worldZ, node: node))
    }

    private func pickArchetype(biome: BiomeID) -> ObstacleArchetype {
        let roll = rng.unitFloat()
        switch biome {
        case .cyberCity, .rooftop:
            if roll < 0.30 { return .lowBar }
            if roll < 0.55 { return .barrier }
            if roll < 0.75 { return .droneSwarm }
            if roll < 0.92 { return .billboard }
            return .hoverCar
        case .subway:
            if roll < 0.40 { return .lowBar }
            if roll < 0.75 { return .fence }
            return .pit
        case .neonHighway:
            if roll < 0.30 { return .hoverCar }
            if roll < 0.65 { return .barrier }
            return .billboard
        case .industrial:
            if roll < 0.50 { return .fence }
            if roll < 0.85 { return .barrier }
            return .pit
        case .skyCity:
            if roll < 0.50 { return .droneSwarm }
            return .antennaTop
        }
    }

    private func obstacleBypass(player: PlayerController, jetpack: JetpackSystem, archetype: ObstacleArchetype) -> Bool {
        switch archetype {
        case .lowBar, .billboard:
            return player.isSliding
        case .barrier, .fence, .pit:
            return !player.isGrounded || jetpack.isFlying
        case .droneSwarm, .hoverCar:
            // Pure dodge — must be in different lane. We test inXY before this
            // function; if we reach here, lanes overlap, so no bypass.
            return false
        case .antennaTop:
            return !jetpack.isFlying
        }
    }
}

@MainActor
private struct LiveObstacle {
    let id: ObstacleID
    let archetype: ObstacleArchetype
    let x: Float
    let worldZ: Float
    let node: SCNNode
    var nearMissed: Bool = false

    func markedAsNearMissed() -> LiveObstacle {
        var copy = self
        copy.nearMissed = true
        return copy
    }
}

extension ObstacleArchetype {
    var spawnY: Float {
        switch self {
        case .lowBar:      return 1.1
        case .barrier:     return 0.55
        case .fence:       return 0.6
        case .pit:         return -0.4
        case .billboard:   return 1.5
        case .droneSwarm:  return 1.7
        case .hoverCar:    return 0.8
        case .antennaTop:  return 5.0
        }
    }
}

// MARK: - Tiny pool

@MainActor
final class ObstaclePool {
    private var pool: [ObstacleArchetype: [SCNNode]] = [:]

    func acquire(archetype: ObstacleArchetype) -> SCNNode {
        if var stack = pool[archetype], let n = stack.popLast() {
            pool[archetype] = stack
            n.isHidden = false
            return n
        }
        return makeNode(for: archetype)
    }

    func recycle(_ ob: Any) {
        // Strongly typed overload below
    }

    func recycle(_ live: Any?) where Any? : Any {}

    func recycle(node: SCNNode, archetype: ObstacleArchetype) {
        node.isHidden = true
        node.removeFromParentNode()
        pool[archetype, default: []].append(node)
    }

    func recycleAll() {
        // Pool is cleared; nodes get GC'd with the scene.
        pool.removeAll(keepingCapacity: true)
    }

    private func makeNode(for archetype: ObstacleArchetype) -> SCNNode {
        let node = SCNNode()
        switch archetype {
        case .lowBar:
            node.geometry = SCNBox(width: 5, height: 0.1, length: 0.4, chamferRadius: 0)
        case .barrier:
            node.geometry = SCNBox(width: 1.4, height: 1.1, length: 0.4, chamferRadius: 0.1)
        case .fence:
            node.geometry = SCNBox(width: 5, height: 1.2, length: 0.2, chamferRadius: 0.05)
        case .pit:
            node.geometry = SCNBox(width: 5, height: 0.05, length: 1.6, chamferRadius: 0)
            node.geometry?.firstMaterial?.diffuse.contents = UIColor.black
        case .billboard:
            node.geometry = SCNBox(width: 1.4, height: 0.1, length: 0.4, chamferRadius: 0)
        case .droneSwarm:
            node.geometry = SCNSphere(radius: 0.3)
        case .hoverCar:
            node.geometry = SCNBox(width: 1.6, height: 0.6, length: 2.5, chamferRadius: 0.2)
        case .antennaTop:
            node.geometry = SCNCylinder(radius: 0.1, height: 2.0)
        }
        node.geometry?.firstMaterial?.diffuse.contents = UIColor(red: 0.7, green: 0.1, blue: 0.4, alpha: 1)
        node.geometry?.firstMaterial?.emission.contents = UIColor(red: 0.9, green: 0.0, blue: 0.4, alpha: 0.5)
        return node
    }
}

// MARK: - Notification helpers

private extension NotificationCenter {
    func postCrash(archetype: ObstacleArchetype) {
        post(name: .neonRunnerCrash, object: nil, userInfo: ["archetype": archetype.rawValue])
    }
    func postNearMiss(id: ObstacleID, distance: Float) {
        post(name: .neonRunnerNearMiss, object: nil, userInfo: ["id": id.raw, "distance": distance])
    }
}

extension Notification.Name {
    static let neonRunnerCrash = Notification.Name("neonRunner.crash")
    static let neonRunnerNearMiss = Notification.Name("neonRunner.nearMiss")
}

// MARK: - Pool helper extensions for live obstacle wrapper

@MainActor
extension ObstaclePool {
    func recycle(_ live: ObstacleSpawnerLiveObstacleProxy) {
        recycle(node: live.node, archetype: live.archetype)
    }
}

// We expose only what the spawner needs from `LiveObstacle` to avoid leaking the type.
@MainActor
struct ObstacleSpawnerLiveObstacleProxy {
    let node: SCNNode
    let archetype: ObstacleArchetype
}

@MainActor
extension Chunk {
    func slotsConsumed(at i: Int) {
        guard i < slots.count else { return }
        slots[i].consumed = true
    }
}
