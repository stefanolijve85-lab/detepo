//
//  AudioDirector.swift
//
//  High-level audio. Owns AVAudioEngine, biome music, SFX one-shots, and
//  parameter mixing tied to gameplay intensity.
//

import Foundation
import AVFoundation

@MainActor
final class AudioDirector {

    private let engine = AVAudioEngine()
    private let mixer = AVAudioMixerNode()
    private let musicBus: AVAudioMixerNode = AVAudioMixerNode()
    private let sfxBus: AVAudioMixerNode = AVAudioMixerNode()
    private let settings: SettingsStore

    private var music: AdaptiveMusic?
    private var oneShots: [AVAudioPlayerNode] = []

    init(settings: SettingsStore) {
        self.settings = settings
        bootstrap()
    }

    private func bootstrap() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.ambient, mode: .default, options: [.mixWithOthers, .allowBluetoothA2DP])
        try? session.setActive(true)

        engine.attach(mixer)
        engine.attach(musicBus)
        engine.attach(sfxBus)
        let format = engine.outputNode.inputFormat(forBus: 0)
        engine.connect(musicBus, to: mixer, format: format)
        engine.connect(sfxBus, to: mixer, format: format)
        engine.connect(mixer, to: engine.mainMixerNode, format: format)

        applyVolumes()
        try? engine.start()

        music = AdaptiveMusic(engine: engine, output: musicBus)
    }

    private func applyVolumes() {
        mixer.outputVolume = settings.masterVolume
        musicBus.outputVolume = settings.musicVolume
        sfxBus.outputVolume = settings.sfxVolume
    }

    func beginRun(biome: BiomeID) {
        applyVolumes()
        music?.start(biome: biome)
    }

    func tick(dt: TimeInterval, intensity: Float, comboTier: Int, jetpackActive: Bool) {
        music?.update(dt: dt, intensity: intensity, comboTier: comboTier, jetpackActive: jetpackActive)
    }

    func playOneShot(_ id: String, gain: Float = 1.0, pan: Float = 0) {
        guard let player = nextOneShotPlayer(),
              let url = Bundle.main.url(forResource: id, withExtension: "caf"),
              let file = try? AVAudioFile(forReading: url) else { return }
        engine.connect(player, to: sfxBus, format: file.processingFormat)
        player.volume = gain
        player.pan = max(-1, min(1, pan))
        player.scheduleFile(file, at: nil) { [weak player] in
            DispatchQueue.main.async { player?.stop() }
        }
        player.play()
    }

    func playReviveSting() {
        playOneShot("revive_chance", gain: 0.9)
    }

    private func nextOneShotPlayer() -> AVAudioPlayerNode? {
        // Cap polyphony at 24
        if oneShots.count > 24 {
            let p = oneShots.removeFirst(); p.stop(); engine.detach(p)
        }
        let p = AVAudioPlayerNode()
        engine.attach(p)
        oneShots.append(p)
        return p
    }
}
