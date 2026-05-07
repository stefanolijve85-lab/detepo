//
//  HeadBob.swift
//
//  Phase-locked head-bob curve. Used by FirstPersonCamera. Driven by horizontal
//  speed so it idles smoothly and intensifies with sprint.
//

import Foundation
import simd

@MainActor
struct HeadBob {
    /// Bobs per second at base speed.
    var stepFrequency: Float = 1.7
    /// Vertical amplitude, meters.
    var verticalAmplitude: Float = 0.045
    /// Horizontal sway amplitude, meters.
    var lateralAmplitude: Float = 0.025
    /// Tilt in degrees that pairs with lateral sway.
    var tiltAmplitude: Float = 0.6

    private(set) var phase: Float = 0

    mutating func advance(dt: TimeInterval, speedNormalized: Float, sliding: Bool) {
        let frequency = stepFrequency * (0.7 + 0.6 * speedNormalized) * (sliding ? 0.0 : 1.0)
        phase += frequency * Float(dt) * 2 * .pi
        if phase > .pi * 2 { phase -= .pi * 2 }
    }

    func sample() -> (offset: Vec3, tiltDegrees: Float) {
        let y = sin(phase * 2) * verticalAmplitude
        let x = sin(phase) * lateralAmplitude
        let tilt = sin(phase) * tiltAmplitude
        return (Vec3(x, y, 0), tilt)
    }
}
