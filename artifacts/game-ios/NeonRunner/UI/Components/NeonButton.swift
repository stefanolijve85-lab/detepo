//
//  NeonButton.swift
//
//  The brand primary CTA. Glowing neon outline + soft pulse on idle. Becomes
//  louder on hover (Catalyst) and on pre-tap.
//

import SwiftUI

struct NeonButton: View {
    let title: String
    let subtitle: String?
    let isPrimary: Bool
    let action: () -> Void

    @State private var pulse: CGFloat = 0
    @State private var pressed: Bool = false

    init(_ title: String, subtitle: String? = nil, isPrimary: Bool = true, action: @escaping () -> Void) {
        self.title = title
        self.subtitle = subtitle
        self.isPrimary = isPrimary
        self.action = action
    }

    var body: some View {
        Button(action: {
            HapticEngine.shared.play(.uiTap)
            action()
        }) {
            VStack(spacing: 2) {
                Text(title.uppercased())
                    .font(DesignSystem.Font.title)
                    .foregroundStyle(DesignSystem.Color.brandWhite)
                if let subtitle {
                    Text(subtitle)
                        .font(DesignSystem.Font.caption)
                        .foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.6))
                }
            }
            .padding(.vertical, isPrimary ? 18 : 12)
            .padding(.horizontal, DesignSystem.Space.lg)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: DesignSystem.Radius.lg, style: .continuous)
                    .fill(LinearGradient(
                        colors: isPrimary
                            ? [DesignSystem.Color.brandMagenta, DesignSystem.Color.brandCyan]
                            : [DesignSystem.Color.bgElevated, DesignSystem.Color.bgPressed],
                        startPoint: .topLeading, endPoint: .bottomTrailing))
                    .shadow(color: DesignSystem.Color.brandMagenta.opacity(isPrimary ? 0.55 : 0), radius: 18 + pulse * 6, x: 0, y: 0)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DesignSystem.Radius.lg, style: .continuous)
                    .stroke(DesignSystem.Color.brandWhite.opacity(0.15), lineWidth: 1)
            )
            .scaleEffect(pressed ? 0.97 : 1.0)
        }
        .buttonStyle(.plain)
        .onAppear {
            withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) {
                pulse = isPrimary ? 1 : 0
            }
        }
        .simultaneousGesture(LongPressGesture(minimumDuration: 0.0001).onChanged { _ in
            withAnimation(.spring(response: 0.18, dampingFraction: 0.7)) { pressed = true }
        }.onEnded { _ in
            withAnimation(.spring(response: 0.32, dampingFraction: 0.7)) { pressed = false }
        })
    }
}
