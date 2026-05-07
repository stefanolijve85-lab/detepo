//
//  BattlePassView.swift
//

import SwiftUI

struct BattlePassView: View {
    @Environment(AppDependencies.self) private var deps

    var body: some View {
        ZStack {
            GradientBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: DesignSystem.Space.lg) {
                    header
                    progressBar
                    tracksHeader
                    tierGrid
                    actionButtons
                }
                .padding(.horizontal, DesignSystem.Space.lg)
                .padding(.top, 12)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("BATTLE PASS").font(DesignSystem.Font.tag).foregroundStyle(DesignSystem.Color.brandMagenta)
            Text("Season 1 — Neon Genesis").font(DesignSystem.Font.title).foregroundStyle(DesignSystem.Color.brandWhite)
            Text("⏱ 18 days remaining").font(DesignSystem.Font.caption).foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.6))
        }
    }

    private var progressBar: some View {
        let p = deps.profileStore.profile
        let tier = p.battlePassTier
        let xp = p.battlePassXP % 1000
        return VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Tier \(tier) / 50").font(DesignSystem.Font.bodyEmph).foregroundStyle(DesignSystem.Color.brandWhite)
                Spacer()
                Text("\(xp)/1000 XP").font(DesignSystem.Font.monoNumSm).foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.7))
            }
            ZStack(alignment: .leading) {
                Capsule().fill(DesignSystem.Color.bgPressed.opacity(0.6)).frame(height: 12)
                Capsule().fill(LinearGradient(colors: [DesignSystem.Color.brandMagenta, DesignSystem.Color.brandCyan], startPoint: .leading, endPoint: .trailing))
                    .frame(width: max(8, CGFloat(xp) / 1000.0 * 320), height: 12)
            }
        }
    }

    private var tracksHeader: some View {
        HStack { Text("FREE").font(DesignSystem.Font.tag).foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.7)); Spacer() }
            .padding(.top, 8)
    }

    private var tierGrid: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(1...50, id: \.self) { tier in
                    tierCell(tier: tier)
                }
            }.padding(.bottom, 8)
        }
    }

    private func tierCell(tier: Int) -> some View {
        let unlocked = deps.profileStore.profile.battlePassTier >= tier
        return VStack(spacing: 6) {
            Text("T\(tier)").font(DesignSystem.Font.tag).foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.7))
            RoundedRectangle(cornerRadius: 8).fill(DesignSystem.Color.bgElevated.opacity(unlocked ? 0.95 : 0.5))
                .frame(width: 56, height: 56)
                .overlay(Image(systemName: unlocked ? "checkmark.circle.fill" : "lock.fill")
                    .foregroundStyle(unlocked ? DesignSystem.Color.success : DesignSystem.Color.brandWhite.opacity(0.4)))
        }
    }

    private var actionButtons: some View {
        HStack {
            NeonButton("Claim all", isPrimary: true) {
                Task { await deps.profileStore.claimAllBattlePassRewards() }
            }
            NeonButton("Upgrade premium\n999 💎", isPrimary: false) {
                deps.iap.purchase(productId: "battlepass_premium")
            }
        }
    }
}
