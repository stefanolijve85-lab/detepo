//
//  RarityChip.swift
//
//  Small "★★★★ Epic" pill used in the shop and battle pass.
//

import SwiftUI

struct RarityChip: View {
    let rarity: JetpackRarity

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<starCount, id: \.self) { _ in
                Image(systemName: "star.fill").font(.system(size: 9, weight: .black))
            }
            Text(rarity.rawValue.uppercased())
                .font(DesignSystem.Font.tag)
        }
        .foregroundStyle(Color.neonRarity(rarity))
        .padding(.vertical, 4)
        .padding(.horizontal, 8)
        .background(Capsule().fill(Color.neonRarity(rarity).opacity(0.12)))
        .overlay(Capsule().stroke(Color.neonRarity(rarity).opacity(0.35), lineWidth: 1))
    }

    private var starCount: Int {
        switch rarity {
        case .common: 1
        case .rare: 2
        case .epic: 3
        case .legendary: 5
        }
    }
}
