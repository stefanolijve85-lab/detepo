//
//  PowerUpStackView.swift
//

import SwiftUI

struct PowerUpStackView: View {
    let items: [PowerUpSnapshot]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(items) { item in
                PowerUpChip(snapshot: item)
            }
        }
    }
}

private struct PowerUpChip: View {
    let snapshot: PowerUpSnapshot

    var body: some View {
        HStack(spacing: 8) {
            Text(symbol)
            VStack(alignment: .leading, spacing: 2) {
                Text(snapshot.kind.displayName.uppercased())
                    .font(DesignSystem.Font.tag)
                    .foregroundStyle(DesignSystem.Color.brandWhite)
                ZStack(alignment: .leading) {
                    Capsule().fill(DesignSystem.Color.bgPressed.opacity(0.5)).frame(width: 72, height: 4)
                    Capsule().fill(DesignSystem.Color.brandCyan).frame(width: 72 * snapshot.fraction, height: 4)
                }
            }
            Text(String(format: "%.1fs", snapshot.durationRemaining))
                .font(DesignSystem.Font.monoNumSm)
                .foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.7))
        }
        .padding(.vertical, 4)
        .padding(.horizontal, 8)
        .background(Capsule().fill(DesignSystem.Color.bgElevated.opacity(0.6)))
    }

    private var symbol: String {
        switch snapshot.kind {
        case .coinMagnet:      "🧲"
        case .doubleCoins:     "🪙"
        case .slowMotion:      "⏱"
        case .shield:          "🛡"
        case .scoreMultiplier: "✨"
        case .speedBoost:      "⚡️"
        case .timeFreeze:      "❄️"
        case .megaJump:        "⏫"
        case .ghostMode:       "👻"
        case .autoDodge:       "🎯"
        }
    }
}

extension PowerUpKind {
    var displayName: String {
        switch self {
        case .coinMagnet:      "Coin Magnet"
        case .doubleCoins:     "Double Coins"
        case .slowMotion:      "Slow Motion"
        case .shield:          "Shield"
        case .scoreMultiplier: "Score Multiplier"
        case .speedBoost:      "Speed Boost"
        case .timeFreeze:      "Time Freeze"
        case .megaJump:        "Mega Jump"
        case .ghostMode:       "Ghost Mode"
        case .autoDodge:       "Auto Dodge"
        }
    }
}
