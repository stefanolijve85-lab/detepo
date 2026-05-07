//
//  LeaderboardView.swift
//

import SwiftUI

struct LeaderboardView: View {
    @Environment(AppDependencies.self) private var deps
    @State var scope: LeaderboardScope
    @State private var entries: [LeaderboardEntry] = []
    @State private var myRank: Int?

    var body: some View {
        ZStack {
            GradientBackground()
            VStack(spacing: 8) {
                header
                tabs
                if entries.isEmpty {
                    Spacer()
                    ProgressView().tint(DesignSystem.Color.brandWhite)
                    Spacer()
                } else {
                    list
                }
                if let r = myRank { youRow(rank: r) }
            }
            .padding(.horizontal, DesignSystem.Space.md)
            .padding(.top, 8)
        }
        .task(id: scopeKey(scope)) { await reload() }
    }

    private var header: some View {
        HStack {
            Text("LEADERBOARD").font(DesignSystem.Font.title).foregroundStyle(DesignSystem.Color.brandWhite)
            Spacer()
            Text("Week 19 · ⏱ 3d 4h").font(DesignSystem.Font.caption).foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.6))
        }
    }

    private var tabs: some View {
        HStack(spacing: 6) {
            tab("GLOBAL", scope: .global)
            tab("COUNTRY", scope: .country(iso: deps.profileStore.profile.country))
            tab("FRIENDS", scope: .friends)
            tab("WEEKLY", scope: .weekly)
        }
    }

    private func tab(_ title: String, scope target: LeaderboardScope) -> some View {
        Button { scope = target } label: {
            Text(title)
                .font(DesignSystem.Font.tag)
                .foregroundStyle(scopeKey(scope) == scopeKey(target) ? DesignSystem.Color.brandWhite : DesignSystem.Color.brandWhite.opacity(0.5))
                .padding(.horizontal, 12).padding(.vertical, 7)
                .background(Capsule().fill(scopeKey(scope) == scopeKey(target) ? DesignSystem.Color.brandMagenta.opacity(0.4) : DesignSystem.Color.bgElevated.opacity(0.4)))
        }
    }

    private var list: some View {
        ScrollView {
            LazyVStack(spacing: 4) {
                ForEach(Array(entries.enumerated()), id: \.element.playerId) { (i, e) in
                    HStack(spacing: 10) {
                        Text("#\(e.rank)").frame(width: 56, alignment: .leading)
                            .font(DesignSystem.Font.monoNumSm)
                            .foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.6))
                        Text(e.displayName)
                            .font(DesignSystem.Font.bodyEmph)
                            .foregroundStyle(DesignSystem.Color.brandWhite)
                        Spacer()
                        Text(e.score.formatted(.number))
                            .font(DesignSystem.Font.monoNumSm)
                            .foregroundStyle(DesignSystem.Color.brandCyan)
                    }
                    .padding(.vertical, 10).padding(.horizontal, 12)
                    .background(RoundedRectangle(cornerRadius: 10).fill(i == 0 ? DesignSystem.Color.rarityLegendary.opacity(0.12) : Color.clear))
                }
            }
        }
    }

    private func youRow(rank: Int) -> some View {
        HStack {
            Text("#\(rank)").frame(width: 56, alignment: .leading)
                .font(DesignSystem.Font.monoNumSm)
                .foregroundStyle(DesignSystem.Color.brandMagenta)
            Text("YOU").font(DesignSystem.Font.bodyEmph).foregroundStyle(DesignSystem.Color.brandWhite)
            Spacer()
            Text(deps.profileStore.profile.bestScore.formatted(.number))
                .font(DesignSystem.Font.monoNumSm).foregroundStyle(DesignSystem.Color.brandWhite)
        }
        .padding(.vertical, 12).padding(.horizontal, 12)
        .background(RoundedRectangle(cornerRadius: DesignSystem.Radius.md).fill(DesignSystem.Color.brandMagenta.opacity(0.16)))
    }

    private func scopeKey(_ s: LeaderboardScope) -> String {
        switch s {
        case .global: return "global"
        case .country(let iso): return "country.\(iso)"
        case .friends: return "friends"
        case .weekly: return "weekly"
        case .season(let id): return "season.\(id)"
        case .event(let id): return "event.\(id)"
        }
    }

    private func reload() async {
        do {
            let result = try await deps.leaderboard.topAndMe(scope: scope)
            entries = result.entries
            myRank = result.myRank
        } catch {
            entries = []
        }
    }
}

public struct LeaderboardEntry: Hashable, Sendable {
    public let rank: Int
    public let playerId: String
    public let displayName: String
    public let score: Int
    public let country: String?
    public let equippedJetpackId: String?
}
