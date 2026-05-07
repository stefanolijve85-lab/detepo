//
//  ReviveModalView.swift
//

import SwiftUI

struct ReviveModalView: View {
    @Environment(AppDependencies.self) private var deps
    @State private var countdown: Double = 5

    var body: some View {
        ZStack {
            DesignSystem.Color.bgBase.opacity(0.92).ignoresSafeArea()
            VStack(spacing: 22) {
                Text("CONTINUE YOUR RUN?")
                    .font(DesignSystem.Font.title)
                    .foregroundStyle(DesignSystem.Color.brandWhite)
                Text("⏱ \(Int(ceil(countdown)))")
                    .font(DesignSystem.Font.displayLg)
                    .foregroundStyle(DesignSystem.Color.brandMagenta)
                NeonButton("Watch ad (free)", isPrimary: true) {
                    Task {
                        await deps.iap.watchRewardedAd { granted in
                            if granted { deps.session.acceptRevive(method: .ad) }
                        }
                    }
                }
                NeonButton("Use 50 💎", isPrimary: false) {
                    if deps.profileStore.profile.chips >= 50 {
                        Task { await deps.profileStore.spend(chips: 50) }
                        deps.session.acceptRevive(method: .chips)
                    }
                }
                Button("No thanks") { deps.session.declineRevive() }
                    .foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.6))
            }
            .padding(.horizontal, 24)
        }
        .task {
            while countdown > 0 {
                try? await Task.sleep(nanoseconds: 100_000_000)
                countdown -= 0.1
            }
        }
    }
}
