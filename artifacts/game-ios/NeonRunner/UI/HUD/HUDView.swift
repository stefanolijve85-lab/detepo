//
//  HUDView.swift
//
//  Composes all in-game HUD widgets. Reads the latest snapshot from the session.
//

import SwiftUI

struct HUDView: View {
    let snapshot: HUDSnapshot
    let countdown: Double?

    var body: some View {
        ZStack {
            VStack {
                topBar
                Spacer()
                bottomBar
            }
            .padding(.horizontal, DesignSystem.Space.md)
            .padding(.top, 12)
            .padding(.bottom, 22)

            if snapshot.jetpackActive {
                VStack {
                    Spacer()
                    JetpackFuelMeter(fuel: snapshot.jetpackFuel, capacity: snapshot.jetpackCapacity)
                        .padding(.horizontal, 22)
                        .padding(.bottom, 86)
                }
            }

            HStack {
                PowerUpStackView(items: snapshot.activePowerUps)
                    .padding(.leading, 14)
                    .padding(.top, 86)
                Spacer()
            }

            if let countdown { CountdownOverlay(value: countdown) }
        }
        .allowsHitTesting(false)
    }

    private var topBar: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 2) {
                Text("DISTANCE")
                    .font(DesignSystem.Font.tag)
                    .foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.6))
                CountUpText(value: snapshot.distanceMeters, font: DesignSystem.Font.monoNumMd, duration: 0.18)
            }
            Spacer()
            ComboMeter(tier: snapshot.comboTier, multiplier: snapshot.comboMultiplier, fraction: snapshot.comboFraction)
        }
    }

    private var bottomBar: some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 2) {
                Text("COINS")
                    .font(DesignSystem.Font.tag)
                    .foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.6))
                CountUpText(value: snapshot.coins, font: DesignSystem.Font.monoNumMd, color: DesignSystem.Color.rarityLegendary, duration: 0.20)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("SCORE")
                    .font(DesignSystem.Font.tag)
                    .foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.6))
                CountUpText(value: snapshot.score, font: DesignSystem.Font.monoNumLg, duration: 0.20)
            }
        }
    }
}

private struct CountdownOverlay: View {
    let value: Double
    var body: some View {
        Text(value <= 0.05 ? "GO!" : String(Int(ceil(value))))
            .font(DesignSystem.Font.displayLg)
            .foregroundStyle(DesignSystem.Color.brandWhite)
            .shadow(color: DesignSystem.Color.brandMagenta, radius: 28)
            .transition(.scale.combined(with: .opacity))
    }
}
