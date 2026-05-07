//
//  PickupRegistry.swift
//
//  Coins, chips, power-ups and jetpack pickups. Streams along the pickup-trail
//  metadata embedded in each chunk.
//

import Foundation
import SceneKit

@MainActor
final class PickupRegistry {

    private let world: ChunkStreamer
    private let bus: EventBus
    private var rng = DeterministicRNG(seed: 0)
    private var live: [LivePickup] = []
    private(set) var coinsCollected: Int = 0
    private(set) var chipsCollected: Int = 0

    init(world: ChunkStreamer, bus: EventBus) {
        self.world = world
        self.bus = bus
    }

    func reset(seed: UInt64) {
        rng = DeterministicRNG(seed: seed ^ 0xBABEFACEC0FFEEEE)
        live.removeAll()
        coinsCollected = 0
        chipsCollected = 0
    }

    func tick(dt: TimeInterval, time: GameTime, player: PlayerController, magnetActive: Bool) {
        // Spawn from chunks that have un-consumed pickup trails.
        for chunk in world.activeChunkSnapshots {
            for (i, trail) in chunk.pickupTrails.enumerated() where !trail.consumed {
                spawnTrail(chunk: chunk, trail: trail)
                chunk.consumePickupTrail(at: i)
            }
        }

        // Magnet attraction + pickup tests.
        var stillLive: [LivePickup] = []
        let magnetRadius: Float = magnetActive ? 4.0 : 0.9
        for var p in live {
            let dz = p.worldZ - player.position.z
            if dz < -3 { continue } // missed and dropped behind
            let dx = p.x - player.position.x
            let dy = p.y - player.position.y
            let r2 = dx*dx + dy*dy + dz*dz
            if r2 < magnetRadius * magnetRadius {
                if r2 < 0.7 * 0.7 {
                    // collected
                    switch p.kind {
                    case .coin:
                        coinsCollected += 1
                        bus.publish(.coinCollected(amount: 1, position: Vec3(p.x, p.y, p.worldZ)))
                    case .chip:
                        chipsCollected += 1
                        bus.publish(.chipCollected(amount: 1))
                    case .powerUp(let kind):
                        bus.publish(.powerUpCollected(kind: kind, durationRemaining: kind.defaultDuration))
                    case .jetpack(let catalogId):
                        bus.publish(.jetpackCollected(catalogId: catalogId))
                    }
                    continue
                } else if magnetActive {
                    // Glide toward player
                    let pull: Float = 14.0
                    p.x += (player.position.x - p.x) * Float(dt) * pull
                    p.y += (player.position.y - p.y) * Float(dt) * pull
                }
            }
            stillLive.append(p)
        }
        live = stillLive
    }

    // MARK: - Internal

    private func spawnTrail(chunk: Chunk, trail: PickupTrail) {
        // Decide trail type. Most are coin trails; rare drops are jetpacks +
        // chips + power-ups.
        let roll = rng.unitFloat()
        let count = Int(trail.length / 0.8)
        for i in 0..<count {
            let z = chunk.startZ + trail.startLocalZ + Float(i) * 0.8
            let x = Float(trail.lane - 1) * PlayerController.laneWidth
            let y: Float = 1.4 + sin(Float(i) * 0.6) * 0.2
            if roll < 0.05 && i == count / 2 {
                live.append(LivePickup(kind: .powerUp(weightedRandom(rng: &rng)), x: x, y: y, worldZ: z))
            } else if roll < 0.07 && i == count / 2 {
                live.append(LivePickup(kind: .jetpack("jp_basic_v1"), x: x, y: 1.7, worldZ: z))
            } else if roll < 0.12 && i == 0 {
                live.append(LivePickup(kind: .chip, x: x, y: y, worldZ: z))
            } else {
                live.append(LivePickup(kind: .coin, x: x, y: y, worldZ: z))
            }
        }
    }

    private func weightedRandom(rng: inout DeterministicRNG) -> PowerUpKind {
        let table: [(PowerUpKind, Float)] = [
            (.coinMagnet, 0.20),
            (.doubleCoins, 0.18),
            (.shield, 0.15),
            (.scoreMultiplier, 0.10),
            (.speedBoost, 0.08),
            (.slowMotion, 0.07),
            (.megaJump, 0.06),
            (.timeFreeze, 0.05),
            (.ghostMode, 0.06),
            (.autoDodge, 0.05)
        ]
        let r = rng.unitFloat()
        var acc: Float = 0
        for (k, w) in table { acc += w; if r < acc { return k } }
        return .coinMagnet
    }

    private struct LivePickup {
        enum Kind {
            case coin, chip
            case powerUp(PowerUpKind)
            case jetpack(String)
        }
        let kind: Kind
        var x: Float
        var y: Float
        var worldZ: Float
    }
}

@MainActor
extension Chunk {
    func consumePickupTrail(at i: Int) {
        guard i < pickupTrails.count else { return }
        pickupTrails[i].consumed = true
    }
}

extension PowerUpKind {
    var defaultDuration: TimeInterval {
        switch self {
        case .coinMagnet:      return 8
        case .doubleCoins:     return 8
        case .shield:          return 6
        case .scoreMultiplier: return 10
        case .speedBoost:      return 5
        case .slowMotion:      return 4
        case .timeFreeze:      return 3
        case .megaJump:        return 6
        case .ghostMode:       return 5
        case .autoDodge:       return 4
        }
    }
}
