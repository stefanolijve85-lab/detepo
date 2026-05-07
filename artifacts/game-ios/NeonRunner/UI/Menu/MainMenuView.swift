//
//  MainMenuView.swift
//
//  Top of the menu funnel. Big "TAP TO RUN" CTA, currency status, three
//  contextual cards (missions / battle pass / shop), and a friends leaderboard
//  pull at the bottom.
//

import SwiftUI

struct MainMenuView: View {
    @Environment(AppDependencies.self) private var deps

    var body: some View {
        ZStack {
            GradientBackground()
            ScrollView {
                VStack(spacing: DesignSystem.Space.lg) {
                    statusBar
                    portrait
                    primaryCTA
                    cards
                    friendsCard
                    Spacer(minLength: 64)
                }
                .padding(.horizontal, DesignSystem.Space.lg)
                .padding(.top, 12)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    // MARK: - Status bar

    @ViewBuilder
    private var statusBar: some View {
        HStack {
            Text("NEON RUNNER")
                .font(DesignSystem.Font.title)
                .foregroundStyle(DesignSystem.Color.brandWhite)
                .shadow(color: DesignSystem.Color.brandMagenta.opacity(0.6), radius: 8)
            Spacer()
            currencyPill(icon: "🪙", value: deps.profileStore.profile.bytes)
            currencyPill(icon: "💎", value: deps.profileStore.profile.chips)
        }
    }

    private func currencyPill(icon: String, value: Int) -> some View {
        HStack(spacing: 4) {
            Text(icon)
            CountUpText(value: value, font: DesignSystem.Font.monoNumSm, color: DesignSystem.Color.brandWhite, duration: 0.4)
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 10)
        .background(Capsule().fill(DesignSystem.Color.bgElevated.opacity(0.6)))
        .overlay(Capsule().stroke(DesignSystem.Color.brandWhite.opacity(0.08), lineWidth: 1))
    }

    // MARK: - Portrait preview

    private var portrait: some View {
        ZStack {
            RoundedRectangle(cornerRadius: DesignSystem.Radius.lg)
                .fill(LinearGradient(colors: [DesignSystem.Color.bgElevated, DesignSystem.Color.bgPressed], startPoint: .top, endPoint: .bottom))
                .frame(height: 280)
                .overlay(
                    RoundedRectangle(cornerRadius: DesignSystem.Radius.lg)
                        .stroke(DesignSystem.Color.brandWhite.opacity(0.06), lineWidth: 1)
                )
            // Ideally a 3D loadout preview. Placeholder:
            VStack(spacing: 8) {
                Image(systemName: "figure.run.circle")
                    .font(.system(size: 96, weight: .black))
                    .foregroundStyle(LinearGradient(colors: [DesignSystem.Color.brandMagenta, DesignSystem.Color.brandCyan], startPoint: .leading, endPoint: .trailing))
                Text(deps.profileStore.profile.displayName.uppercased())
                    .font(DesignSystem.Font.title)
                    .foregroundStyle(DesignSystem.Color.brandWhite)
                Text("Level \(deps.profileStore.profile.level)  ·  \(deps.session.equippedJetpackId)")
                    .font(DesignSystem.Font.caption)
                    .foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.5))
            }
        }
    }

    // MARK: - Primary CTA

    private var primaryCTA: some View {
        NeonButton("Tap to run", subtitle: "Best: \(deps.profileStore.profile.bestScore.formatted(.number))") {
            deps.session.startRun()
        }
    }

    // MARK: - Three cards

    private var cards: some View {
        HStack(spacing: DesignSystem.Space.sm) {
            menuCard(title: "Missions", subtitle: missionsSubtitle, color: DesignSystem.Color.brandCyan) {
                deps.router.present(.missions)
            }
            menuCard(title: "Battle Pass", subtitle: "Tier \(deps.profileStore.profile.battlePassTier)/50", color: DesignSystem.Color.brandMagenta) {
                deps.router.tab = .battlePass
            }
            menuCard(title: "Shop", subtitle: "NEW!", color: DesignSystem.Color.rarityLegendary) {
                deps.router.present(.shop)
            }
        }
    }

    private var missionsSubtitle: String {
        let p = deps.profileStore.profile
        return "\(p.missionsCompletedToday)/\(p.missionsAssignedToday)"
    }

    private func menuCard(title: String, subtitle: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: { HapticEngine.shared.play(.uiTap); action() }) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title.uppercased())
                    .font(DesignSystem.Font.tag)
                    .foregroundStyle(color)
                Text(subtitle)
                    .font(DesignSystem.Font.bodyEmph)
                    .foregroundStyle(DesignSystem.Color.brandWhite)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(RoundedRectangle(cornerRadius: DesignSystem.Radius.md).fill(DesignSystem.Color.bgElevated.opacity(0.6)))
            .overlay(RoundedRectangle(cornerRadius: DesignSystem.Radius.md).stroke(color.opacity(0.4), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Friends card

    private var friendsCard: some View {
        Button(action: {
            deps.router.tab = .leaderboard
        }) {
            HStack {
                Text("🏆")
                Text("Friends Leaderboard")
                    .font(DesignSystem.Font.bodyEmph)
                    .foregroundStyle(DesignSystem.Color.brandWhite)
                Spacer()
                if let rank = deps.profileStore.profile.lastFriendsRank {
                    Text("#\(rank)")
                        .font(DesignSystem.Font.bodyEmph)
                        .foregroundStyle(DesignSystem.Color.brandCyan)
                    Image(systemName: "chevron.right")
                        .foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.5))
                }
            }
            .padding(14)
            .background(RoundedRectangle(cornerRadius: DesignSystem.Radius.md).fill(DesignSystem.Color.bgElevated.opacity(0.6)))
        }
        .buttonStyle(.plain)
    }
}
