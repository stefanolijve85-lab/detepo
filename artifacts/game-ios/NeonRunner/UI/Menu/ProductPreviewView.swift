//
//  ProductPreviewView.swift
//
//  3D loadout preview for store items. Tap-to-buy lives here.
//

import SwiftUI
import SceneKit

struct ProductPreviewView: View {
    let productId: String
    @Environment(AppDependencies.self) private var deps

    var body: some View {
        ZStack {
            GradientBackground()
            VStack {
                Text("PREVIEW").font(DesignSystem.Font.title).foregroundStyle(DesignSystem.Color.brandWhite)
                ZStack {
                    RoundedRectangle(cornerRadius: DesignSystem.Radius.lg).fill(DesignSystem.Color.bgElevated.opacity(0.6))
                    Image(systemName: "burst.fill").font(.system(size: 96)).foregroundStyle(DesignSystem.Color.brandMagenta)
                }
                .frame(height: 360)
                .padding(.horizontal, 24)
                NeonButton("Equip", isPrimary: true) {
                    deps.session.equipJetpack(catalogId: productId)
                    deps.router.dismissSheet()
                }
                Spacer()
            }
        }
    }
}
