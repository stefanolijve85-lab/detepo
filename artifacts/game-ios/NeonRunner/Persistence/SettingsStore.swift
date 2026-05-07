//
//  SettingsStore.swift
//

import Foundation
import SwiftUI

public enum SwipeSensitivity: String, Codable, Sendable, Hashable { case low, standard, high }
public enum FrameRate: String, Codable, Sendable, Hashable { case sixty, hundredTwenty }
public enum QualityPreset: String, Codable, Sendable, Hashable { case low, medium, high, ultra }
public enum ColorblindMode: String, Codable, Sendable, Hashable { case off, deuteranopia, protanopia, tritanopia }

@Observable
@MainActor
final class SettingsStore {

    public var swipeSensitivity: SwipeSensitivity = .standard
    public var leftHanded: Bool = false
    public var reducedMotion: Bool = false
    public var highContrast: Bool = false
    public var subtitlesForCues: Bool = true
    public var colorblindMode: ColorblindMode = .off
    public var hapticIntensity: Double = 0.75
    public var frameRate: FrameRate = .hundredTwenty
    public var qualityPreset: QualityPreset = .ultra
    public var motionBlur: Bool = true
    public var masterVolume: Float = 1.0
    public var musicVolume: Float = 0.7
    public var sfxVolume: Float = 0.85

    static func live() -> SettingsStore { SettingsStore() }

    public var swipeSensitivityFactor: Float {
        switch swipeSensitivity {
        case .low: 0.6
        case .standard: 1.0
        case .high: 1.5
        }
    }

    /// Bridges a property to a SwiftUI Binding.
    func binding<T>(_ keyPath: ReferenceWritableKeyPath<SettingsStore, T>) -> Binding<T> {
        Binding(get: { self[keyPath: keyPath] }, set: { self[keyPath: keyPath] = $0 })
    }
}
