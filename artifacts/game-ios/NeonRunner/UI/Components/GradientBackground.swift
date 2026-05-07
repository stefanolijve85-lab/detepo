//
//  GradientBackground.swift
//
//  Animated diagonal duotone background, brand magenta -> cyan, with a faint
//  scrolling grid overlay. Used behind menus.
//

import SwiftUI

struct GradientBackground: View {
    @State private var t: Double = 0

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [DesignSystem.Color.bgBase, DesignSystem.Color.bgElevated],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )

            // Soft brand gradient orbs
            Circle()
                .fill(DesignSystem.Color.brandMagenta.opacity(0.18))
                .frame(width: 360, height: 360)
                .blur(radius: 80)
                .offset(x: -120, y: -240 + sin(t) * 20)
            Circle()
                .fill(DesignSystem.Color.brandCyan.opacity(0.16))
                .frame(width: 380, height: 380)
                .blur(radius: 80)
                .offset(x: 140, y: 280 - cos(t) * 24)

            // Grid overlay
            Canvas { ctx, size in
                let spacing: CGFloat = 36
                let lineColor = DesignSystem.Color.brandWhite.opacity(0.04)
                let path = Path { p in
                    var x: CGFloat = 0
                    while x <= size.width { p.move(to: CGPoint(x: x, y: 0)); p.addLine(to: CGPoint(x: x, y: size.height)); x += spacing }
                    var y: CGFloat = CGFloat(t.truncatingRemainder(dividingBy: spacing))
                    while y <= size.height { p.move(to: CGPoint(x: 0, y: y)); p.addLine(to: CGPoint(x: size.width, y: y)); y += spacing }
                }
                ctx.stroke(path, with: .color(lineColor), lineWidth: 1)
            }
        }
        .ignoresSafeArea()
        .onAppear {
            withAnimation(.linear(duration: 24).repeatForever(autoreverses: false)) {
                t = 36 * 12  // scroll the grid
            }
        }
    }
}
