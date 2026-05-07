//
//  DesignSystem.swift
//
//  Brand tokens. Every SwiftUI view should consume from here, not literal colors.
//

import SwiftUI

enum DesignSystem {

    enum Color {
        static let bgBase     = SwiftUI.Color(red: 0.04, green: 0.04, blue: 0.07)
        static let bgElevated = SwiftUI.Color(red: 0.08, green: 0.10, blue: 0.18)
        static let bgPressed  = SwiftUI.Color(red: 0.12, green: 0.14, blue: 0.22)

        static let brandMagenta = SwiftUI.Color(red: 1.00, green: 0.18, blue: 0.49)
        static let brandCyan    = SwiftUI.Color(red: 0.22, green: 0.88, blue: 1.00)
        static let brandWhite   = SwiftUI.Color(red: 0.97, green: 0.97, blue: 1.00)

        static let rarityCommon    = SwiftUI.Color(white: 0.85)
        static let rarityRare      = SwiftUI.Color(red: 0.42, green: 0.66, blue: 1.0)
        static let rarityEpic      = SwiftUI.Color(red: 0.85, green: 0.40, blue: 1.0)
        static let rarityLegendary = SwiftUI.Color(red: 1.0, green: 0.78, blue: 0.27)

        static let success = SwiftUI.Color(red: 0.30, green: 0.95, blue: 0.65)
        static let danger  = SwiftUI.Color(red: 1.00, green: 0.30, blue: 0.30)
        static let warning = SwiftUI.Color(red: 1.00, green: 0.78, blue: 0.27)
    }

    enum Font {
        static let display    = SwiftUI.Font.system(size: 36, weight: .black,    design: .rounded)
        static let displayLg  = SwiftUI.Font.system(size: 56, weight: .black,    design: .rounded)
        static let title      = SwiftUI.Font.system(size: 24, weight: .heavy,    design: .rounded)
        static let body       = SwiftUI.Font.system(size: 17, weight: .regular,  design: .rounded)
        static let bodyEmph   = SwiftUI.Font.system(size: 17, weight: .semibold, design: .rounded)
        static let caption    = SwiftUI.Font.system(size: 13, weight: .medium,   design: .rounded)
        static let tag        = SwiftUI.Font.system(size: 11, weight: .heavy,    design: .rounded)
        static let monoNumLg  = SwiftUI.Font.system(size: 32, weight: .heavy,    design: .monospaced)
        static let monoNumMd  = SwiftUI.Font.system(size: 22, weight: .heavy,    design: .monospaced)
        static let monoNumSm  = SwiftUI.Font.system(size: 14, weight: .semibold, design: .monospaced)
    }

    enum Radius {
        static let sm: CGFloat = 8
        static let md: CGFloat = 14
        static let lg: CGFloat = 22
        static let pill: CGFloat = 99
    }

    enum Space {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 14
        static let lg: CGFloat = 22
        static let xl: CGFloat = 36
    }
}

extension Color {
    /// Convenience for rarity color from JetpackRarity / inventory rarity.
    static func neonRarity(_ rarity: JetpackRarity) -> Color {
        switch rarity {
        case .common:    return DesignSystem.Color.rarityCommon
        case .rare:      return DesignSystem.Color.rarityRare
        case .epic:      return DesignSystem.Color.rarityEpic
        case .legendary: return DesignSystem.Color.rarityLegendary
        }
    }
}
