//
//  EndOfRunView.swift
//
//  Cinematic post-run summary.
//

import SwiftUI

struct EndOfRunView: View {
    let summary: RunSummary
    @Environment(AppDependencies.self) private var deps
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            GradientBackground()
            ScrollView {
                VStack(spacing: DesignSystem.Space.lg) {
                    title
                    scoreCard
                    rowMetrics
                    leaderboardCard
                    actionRow
                    extras
                }
                .padding(.horizontal, DesignSystem.Space.lg)
                .padding(.top, 28)
            }
        }
    }

    private var title: some View {
        VStack(spacing: 4) {
            if isPersonalBest {
                Text("🏆 NEW PERSONAL BEST")
                    .font(DesignSystem.Font.tag)
                    .foregroundStyle(DesignSystem.Color.rarityLegendary)
            }
            Text("RUN COMPLETE")
                .font(DesignSystem.Font.display)
                .foregroundStyle(DesignSystem.Color.brandWhite)
        }
    }

    private var scoreCard: some View {
        VStack(spacing: 4) {
            CountUpText(value: summary.scoreClient, font: DesignSystem.Font.displayLg, duration: 1.0)
            if isPersonalBest, let prev = deps.profileStore.profile.previousBestScore {
                Text("+\((summary.scoreClient - prev).formatted(.number)) from last")
                    .font(DesignSystem.Font.caption)
                    .foregroundStyle(DesignSystem.Color.success)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(20)
        .background(RoundedRectangle(cornerRadius: DesignSystem.Radius.lg).fill(DesignSystem.Color.bgElevated.opacity(0.8)))
    }

    private var rowMetrics: some View {
        VStack(spacing: 10) {
            metric("DISTANCE", "\(summary.distanceCm / 100) m")
            metric("COINS", "\(summary.coins)")
            metric("COMBO MAX", "×\(summary.comboMax)")
            metric("NEAR MISS", "\(summary.nearMisses)")
            metric("JETPACK TIME", String(format: "%.1fs", Double(summary.jetpackTimeMs) / 1000))
        }
    }

    private func metric(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .font(DesignSystem.Font.tag)
                .foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.6))
            Spacer()
            Text(value)
                .font(DesignSystem.Font.bodyEmph)
                .foregroundStyle(DesignSystem.Color.brandWhite)
        }
    }

    private var leaderboardCard: some View {
        VStack(spacing: 6) {
            Text("LEADERBOARDS")
                .font(DesignSystem.Font.tag)
                .foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.6))
            // Placeholder — fed by leaderboard service after submission.
            Text("Submitting…")
                .font(DesignSystem.Font.body)
                .foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.5))
        }
        .frame(maxWidth: .infinity)
        .padding(16)
        .background(RoundedRectangle(cornerRadius: DesignSystem.Radius.md).fill(DesignSystem.Color.bgElevated.opacity(0.6)))
    }

    private var actionRow: some View {
        HStack(spacing: DesignSystem.Space.md) {
            NeonButton("Run again", isPrimary: true) {
                deps.session.dismissEndOfRun()
                deps.session.startRun()
                deps.router.dismissSheet()
            }
            NeonButton("+500 Bytes\nWatch ad", isPrimary: false) {
                Task { await deps.iap.watchRewardedAd { granted in
                    if granted {
                        Task { await deps.profileStore.grant(bytes: 500, chips: 0, source: .ad) }
                    }
                } }
            }
        }
    }

    private var extras: some View {
        HStack(spacing: 14) {
            Button {
                deps.iap.shareReplay(summary: summary)
            } label: {
                Label("Share clip", systemImage: "square.and.arrow.up")
                    .font(DesignSystem.Font.body)
            }
            Spacer()
            Button {
                deps.session.dismissEndOfRun()
                deps.router.dismissSheet()
            } label: {
                Text("Home")
                    .font(DesignSystem.Font.body)
            }
        }
        .foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.7))
        .padding(.top, 12)
    }

    private var isPersonalBest: Bool {
        summary.scoreClient > (deps.profileStore.profile.previousBestScore ?? 0)
    }
}
