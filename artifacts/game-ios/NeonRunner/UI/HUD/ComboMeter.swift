//
//  ComboMeter.swift
//

import SwiftUI

struct ComboMeter: View {
    let tier: Int
    let multiplier: Double
    let fraction: Double

    var body: some View {
        VStack(alignment: .trailing, spacing: 4) {
            HStack(spacing: 4) {
                Text("🔥")
                Text("×\(tier == 0 ? 1 : tier)")
                    .font(DesignSystem.Font.monoNumMd)
                    .foregroundStyle(tier > 0 ? DesignSystem.Color.brandMagenta : DesignSystem.Color.brandWhite.opacity(0.5))
            }
            ZStack(alignment: .leading) {
                Capsule().fill(DesignSystem.Color.bgPressed.opacity(0.6)).frame(width: 88, height: 6)
                Capsule().fill(LinearGradient(colors: [DesignSystem.Color.brandMagenta, DesignSystem.Color.brandCyan], startPoint: .leading, endPoint: .trailing))
                    .frame(width: 88 * fraction, height: 6)
            }
            Text("×\(multiplier, specifier: "%.1f")")
                .font(DesignSystem.Font.tag)
                .foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.7))
        }
    }
}
