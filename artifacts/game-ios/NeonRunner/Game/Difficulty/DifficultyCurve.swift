//
//  DifficultyCurve.swift
//
//  Computes target speed, obstacle density, and active biome over time. All
//  parameters are remote-config tunable; see `RemoteConfigKey`.
//

import Foundation

@MainActor
final class DifficultyCurve {
    private let remoteConfig: RemoteConfigService

    private var elapsed: TimeInterval = 0
    private(set) var currentSpeed: Float = 12.0
    private(set) var currentDensity: Float = 1.0
    private(set) var currentBiome: BiomeID = .cyberCity

    private var biomeOrder: [BiomeID] = [.cyberCity, .rooftop, .subway, .neonHighway, .industrial, .skyCity]
    private var biomeStartTimes: [TimeInterval] = []

    /// 0..1 normalized intensity used by audio + VFX directors.
    var intensityNormalized: Float {
        let v0: Float = 12, vMax: Float = 28
        return min(1, max(0, (currentSpeed - v0) / (vMax - v0)))
    }

    init(remoteConfig: RemoteConfigService) {
        self.remoteConfig = remoteConfig
    }

    func reset() {
        elapsed = 0
        currentSpeed = remoteConfig.value(.startSpeed, default: 12.0)
        currentDensity = 1.0
        currentBiome = .cyberCity
        // Biome rotation roughly every 75 s, ±10 jitter resolved at startup
        let stageLength = remoteConfig.value(.biomeStageSeconds, default: 75.0)
        biomeStartTimes = stride(from: 0.0, through: stageLength * Double(biomeOrder.count - 1), by: stageLength).map { $0 }
    }

    func tick(dt: TimeInterval, time: GameTime) {
        elapsed += dt

        let v0: Float = remoteConfig.value(.startSpeed, default: 12.0)
        let vMax: Float = remoteConfig.value(.maxSpeed, default: 28.0)
        let tau: Float = remoteConfig.value(.speedTimeConstant, default: 110.0)

        // Logistic-ish ramp: smooth approach to vMax.
        currentSpeed = v0 + (vMax - v0) * (1 - exp(-Float(elapsed) / tau))

        let d0: Float = 1.0
        let dMax: Float = remoteConfig.value(.maxDensity, default: 2.4)
        currentDensity = min(dMax, d0 + 0.10 * sqrt(Float(elapsed)))

        // Biome stage transitions.
        for (i, t) in biomeStartTimes.enumerated().reversed() where elapsed >= t {
            currentBiome = biomeOrder[min(i, biomeOrder.count - 1)]
            break
        }
    }
}
