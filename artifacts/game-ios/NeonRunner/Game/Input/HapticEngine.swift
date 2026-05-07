//
//  HapticEngine.swift
//
//  Wraps Core Haptics. Patterns are loaded from .ahap resources at startup and
//  played by name. A single CHHapticEngine is reused; we restart on
//  `notifyWhenStopped` to keep the engine alive across audio session changes.
//

import Foundation
import CoreHaptics
import UIKit

public enum HapticPattern: String, CaseIterable {
    case coin
    case nearMiss
    case jetpackIgnite
    case jump
    case slideStart
    case crash
    case comboBreak
    case levelUp
    case uiTap
    case uiBack
}

@MainActor
final class HapticEngine {
    static let shared = HapticEngine()

    private var engine: CHHapticEngine?
    private var patterns: [HapticPattern: CHHapticPattern] = [:]
    private var intensity: Float = 1.0
    private var isAvailable: Bool {
        CHHapticEngine.capabilitiesForHardware().supportsHaptics
    }

    private init() {}

    func bootstrap(intensity: Float) {
        self.intensity = intensity
        guard isAvailable else { return }
        do {
            engine = try CHHapticEngine()
            engine?.resetHandler = { [weak self] in
                Task { @MainActor in self?.tryStart() }
            }
            engine?.stoppedHandler = { _ in /* silent recovery */ }
            try engine?.start()
            preloadPatterns()
        } catch {
            engine = nil
        }
    }

    func setIntensity(_ value: Float) {
        intensity = max(0, min(1, value))
    }

    func play(_ pattern: HapticPattern) {
        guard intensity > 0.01 else { return }
        if let p = patterns[pattern] {
            try? engine?.makePlayer(with: p).start(atTime: 0)
        } else {
            // Fallback to UIImpactFeedbackGenerator for predictable cues.
            fallback(pattern)
        }
    }

    // MARK: - Internal

    private func tryStart() {
        guard isAvailable else { return }
        try? engine?.start()
    }

    private func preloadPatterns() {
        for pattern in HapticPattern.allCases {
            if let url = Bundle.main.url(forResource: pattern.rawValue, withExtension: "ahap"),
               let data = try? Data(contentsOf: url),
               let json = try? JSONSerialization.jsonObject(with: data) as? [CHHapticPattern.Key: Any],
               let p = try? CHHapticPattern(dictionary: json) {
                patterns[pattern] = p
            }
        }
    }

    private func fallback(_ pattern: HapticPattern) {
        switch pattern {
        case .coin, .uiTap:
            UISelectionFeedbackGenerator().selectionChanged()
        case .nearMiss, .jump, .slideStart, .uiBack, .comboBreak:
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case .jetpackIgnite, .crash, .levelUp:
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        }
    }
}
