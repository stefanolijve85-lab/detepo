//
//  MissionsView.swift
//

import SwiftUI

struct MissionsView: View {
    @Environment(AppDependencies.self) private var deps

    var body: some View {
        ZStack {
            GradientBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("MISSIONS").font(DesignSystem.Font.title).foregroundStyle(DesignSystem.Color.brandWhite)
                    Text("DAILY · refresh in 6h 12m")
                        .font(DesignSystem.Font.tag).foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.6))
                    ForEach(deps.profileStore.profile.dailyMissions) { mission in
                        missionRow(mission)
                    }
                    Text("WEEKLY · refresh Monday")
                        .font(DesignSystem.Font.tag).foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.6))
                        .padding(.top, 16)
                    ForEach(deps.profileStore.profile.weeklyMissions) { mission in
                        missionRow(mission)
                    }
                }
                .padding(.horizontal, DesignSystem.Space.lg)
                .padding(.top, 12)
            }
        }
    }

    private func missionRow(_ mission: PlayerMission) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(mission.description).font(DesignSystem.Font.bodyEmph).foregroundStyle(DesignSystem.Color.brandWhite)
                Spacer()
                Text("+\(mission.rewardBytes) 🪙").font(DesignSystem.Font.caption).foregroundStyle(DesignSystem.Color.rarityLegendary)
            }
            ZStack(alignment: .leading) {
                Capsule().fill(DesignSystem.Color.bgPressed.opacity(0.6)).frame(height: 10)
                Capsule().fill(DesignSystem.Color.brandCyan)
                    .frame(width: max(8, CGFloat(mission.progress) / CGFloat(max(1, mission.target)) * 320), height: 10)
            }
            HStack {
                Text("\(mission.progress) / \(mission.target)")
                    .font(DesignSystem.Font.monoNumSm).foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.7))
                Spacer()
                if mission.isComplete && !mission.isClaimed {
                    Button("CLAIM") { Task { await deps.profileStore.claimMission(mission) } }
                        .font(DesignSystem.Font.tag).buttonStyle(.borderedProminent).tint(DesignSystem.Color.brandMagenta)
                } else if mission.isClaimed {
                    Text("CLAIMED").font(DesignSystem.Font.tag).foregroundStyle(DesignSystem.Color.success)
                }
            }
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: DesignSystem.Radius.md).fill(DesignSystem.Color.bgElevated.opacity(0.6)))
    }
}
