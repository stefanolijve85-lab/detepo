//
//  CountUpText.swift
//
//  Animated integer counter. Used for score, coins, currency. Tabular numerals.
//

import SwiftUI

struct CountUpText: View {
    let value: Int
    let font: Font
    let color: Color
    let duration: TimeInterval

    @State private var displayed: Double = 0

    init(value: Int, font: Font = DesignSystem.Font.monoNumLg, color: Color = DesignSystem.Color.brandWhite, duration: TimeInterval = 0.35) {
        self.value = value
        self.font = font
        self.color = color
        self.duration = duration
    }

    var body: some View {
        Text(formatted(Int(displayed)))
            .font(font)
            .monospacedDigit()
            .foregroundStyle(color)
            .onAppear { displayed = Double(value) }
            .onChange(of: value) { _, new in
                withAnimation(.easeOut(duration: duration)) { displayed = Double(new) }
            }
            .contentTransition(.numericText(value: Double(value)))
    }

    private func formatted(_ n: Int) -> String {
        n.formatted(.number.grouping(.automatic))
    }
}
