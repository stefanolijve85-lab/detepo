//
//  ChunkStreamer.swift
//
//  Streams 30m-long world chunks ahead of the player. Each chunk is built once
//  on a background queue, kept in a pool, and recycled when the player is past
//  it. Geometry, materials, and lights are all preallocated — we never allocate
//  during gameplay.
//

import Foundation
import SceneKit

@MainActor
final class ChunkStreamer {

    static let chunkLengthMeters: Float = 30.0
    static let aheadChunks: Int = 6      // 180m render-ahead
    static let behindChunks: Int = 1     // 30m kept for parallax + reflections

    private let scene: SceneRendererBridge
    private var rng = DeterministicRNG(seed: 1)
    private var activeChunks: [Chunk] = []
    private var chunkPool: [Chunk] = []
    private var playerZ: Float = 0
    private var spawnedUpToZ: Float = 0
    private(set) var visitedBiomes: [BiomeID] = []
    private var lastBiome: BiomeID = .cyberCity

    init(scene: SceneRendererBridge) {
        self.scene = scene
    }

    func reset(seed: UInt64) {
        rng = DeterministicRNG(seed: seed)
        activeChunks.forEach { recycle($0) }
        activeChunks.removeAll(keepingCapacity: true)
        playerZ = 0
        spawnedUpToZ = 0
        visitedBiomes = [.cyberCity]
        lastBiome = .cyberCity
        // Pre-warm: spawn N initial chunks so the first frame is full.
        for _ in 0..<Self.aheadChunks {
            spawnNextChunk(biome: .cyberCity)
        }
    }

    func tick(playerZ: Float, biome: BiomeID) {
        self.playerZ = playerZ
        if biome != lastBiome {
            lastBiome = biome
            visitedBiomes.append(biome)
        }
        // Spawn ahead.
        let lookAheadZ = playerZ + Float(Self.aheadChunks) * Self.chunkLengthMeters
        while spawnedUpToZ < lookAheadZ {
            spawnNextChunk(biome: biome)
        }
        // Recycle behind.
        let dropZ = playerZ - Float(Self.behindChunks) * Self.chunkLengthMeters
        while let first = activeChunks.first, first.endZ < dropZ {
            activeChunks.removeFirst()
            recycle(first)
        }
    }

    /// Used by ObstacleSpawner / PickupRegistry — they walk the active chunks to
    /// schedule spawns relative to chunk anchors.
    var activeChunkSnapshots: [Chunk] { activeChunks }

    // MARK: - Internal

    private func spawnNextChunk(biome: BiomeID) {
        let chunk = chunkPool.popLast() ?? Chunk(biome: biome, length: Self.chunkLengthMeters)
        chunk.reuse(startZ: spawnedUpToZ, biome: biome, rng: &rng)
        scene.attachChunk(chunk.node)
        activeChunks.append(chunk)
        spawnedUpToZ += Self.chunkLengthMeters
    }

    private func recycle(_ chunk: Chunk) {
        scene.detachChunk(chunk.node)
        chunk.recycle()
        chunkPool.append(chunk)
    }
}
