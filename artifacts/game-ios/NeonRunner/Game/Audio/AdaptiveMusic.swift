//
//  AdaptiveMusic.swift
//
//  Stem-based dynamic music. Each track ships as 5 looping AIFs (pad, drums,
//  lead, arp, riser). Active mix is computed each frame from intensity +
//  combo + jetpack flags. Stem gains ramp linearly, never zipper.
//

import AVFoundation

@MainActor
final class AdaptiveMusic {
    private let engine: AVAudioEngine
    private let output: AVAudioMixerNode
    private var stems: [Stem] = []
    private var currentBiome: BiomeID?

    init(engine: AVAudioEngine, output: AVAudioMixerNode) {
        self.engine = engine
        self.output = output
    }

    func start(biome: BiomeID) {
        guard biome != currentBiome else { return }
        teardown()
        currentBiome = biome
        let trackPrefix = trackPrefix(for: biome)
        for stem in StemKind.allCases {
            let id = "\(trackPrefix)_\(stem.rawValue)"
            if let url = Bundle.main.url(forResource: id, withExtension: "caf"),
               let file = try? AVAudioFile(forReading: url) {
                let player = AVAudioPlayerNode()
                engine.attach(player)
                engine.connect(player, to: output, format: file.processingFormat)
                player.scheduleFile(file, at: nil)  // not looping; we re-schedule on completion
                player.play()
                stems.append(Stem(kind: stem, player: player, file: file))
            }
        }
    }

    func update(dt: TimeInterval, intensity: Float, comboTier: Int, jetpackActive: Bool) {
        for stem in stems {
            let target = stem.kind.targetGain(intensity: intensity, combo: comboTier, jetpack: jetpackActive)
            let alpha = Float(1.0 - exp(-6.0 * dt))
            let new = stem.player.volume + (target - stem.player.volume) * alpha
            stem.player.volume = new
        }
    }

    func teardown() {
        for stem in stems { stem.player.stop(); engine.detach(stem.player) }
        stems.removeAll()
    }

    private func trackPrefix(for biome: BiomeID) -> String {
        switch biome {
        case .cyberCity:   return "music_neon_pulse"
        case .rooftop:     return "music_skyline_drive"
        case .subway:      return "music_underground_velocity"
        case .neonHighway: return "music_night_rider"
        case .industrial:  return "music_iron_lung"
        case .skyCity:     return "music_stratosphere"
        }
    }
}

enum StemKind: String, CaseIterable {
    case pad, drums, lead, arp, riser

    func targetGain(intensity: Float, combo: Int, jetpack: Bool) -> Float {
        switch self {
        case .pad:   return 0.85
        case .drums: return intensity > 0.30 ? 0.85 : 0.0
        case .lead:  return jetpack ? 0.80 : (combo >= 3 ? 0.50 : 0.0)
        case .arp:   return combo >= 4 ? 0.55 : 0.0
        case .riser: return jetpack ? 0.70 : 0.0
        }
    }
}

@MainActor
struct Stem {
    let kind: StemKind
    let player: AVAudioPlayerNode
    let file: AVAudioFile
}
