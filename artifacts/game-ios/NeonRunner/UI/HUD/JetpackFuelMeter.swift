//
//  JetpackFuelMeter.swift
//

import SwiftUI

struct JetpackFuelMeter: View {
    let fuel: TimeInterval
    let capacity: TimeInterval

    private var fraction: Double { max(0, min(1, fuel / max(0.001, capacity))) }
    private var isLow: Bool { fuel <= 1.0 }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("⚡️ JETPACK FUEL")
                    .font(DesignSystem.Font.tag)
                    .foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.7))
                Spacer()
                Text(String(format: "%.1fs", fuel))
                    .font(DesignSystem.Font.monoNumSm)
                    .foregroundStyle(isLow ? DesignSystem.Color.danger : DesignSystem.Color.brandWhite)
            }
            ZStack(alignment: .leading) {
                Capsule().fill(DesignSystem.Color.bgPressed.opacity(0.6)).frame(height: 10)
                Capsule()
                    .fill(LinearGradient(colors: isLow ? [DesignSystem.Color.danger, DesignSystem.Color.warning] : [DesignSystem.Color.brandCyan, DesignSystem.Color.brandMagenta], startPoint: .leading, endPoint: .trailing))
                    .frame(width: 360 * fraction, height: 10)
                    .animation(.easeOut(duration: 0.18), value: fraction)
            }
            .frame(maxWidth: 360)
        }
    }
}
