//
//  ShopView.swift
//

import SwiftUI

struct ShopView: View {
    @Environment(AppDependencies.self) private var deps
    @State private var category: ShopCategory

    init(initialCategory: ShopCategory = .featured) {
        _category = State(initialValue: initialCategory)
    }

    var body: some View {
        ZStack {
            GradientBackground()
            VStack(spacing: 0) {
                headerBar
                categoryTabs
                ScrollView {
                    LazyVStack(spacing: 12) {
                        if category == .featured { featuredCard }
                        ForEach(deps.iap.availableProducts(for: category)) { product in
                            productRow(product)
                        }
                    }
                    .padding(.horizontal, DesignSystem.Space.lg)
                    .padding(.vertical, 12)
                }
            }
        }
    }

    private var headerBar: some View {
        HStack {
            Text("SHOP")
                .font(DesignSystem.Font.title)
                .foregroundStyle(DesignSystem.Color.brandWhite)
            Spacer()
            currencyChip(icon: "🪙", value: deps.profileStore.profile.bytes)
            currencyChip(icon: "💎", value: deps.profileStore.profile.chips)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }

    private func currencyChip(icon: String, value: Int) -> some View {
        HStack(spacing: 4) { Text(icon); Text(value.formatted(.number)) }
            .font(DesignSystem.Font.bodyEmph)
            .padding(.vertical, 6).padding(.horizontal, 10)
            .background(Capsule().fill(DesignSystem.Color.bgElevated.opacity(0.6)))
    }

    private var categoryTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach([ShopCategory.featured, .jetpacks, .gloves, .trails, .currency], id: \.self) { c in
                    Button { category = c } label: {
                        Text(c.rawValue.uppercased())
                            .font(DesignSystem.Font.tag)
                            .foregroundStyle(category == c ? DesignSystem.Color.brandWhite : DesignSystem.Color.brandWhite.opacity(0.5))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 7)
                            .background(Capsule().fill(category == c ? DesignSystem.Color.brandMagenta.opacity(0.4) : DesignSystem.Color.bgElevated.opacity(0.4)))
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 8)
        }
    }

    private var featuredCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("LIMITED — DRAGON JETPACK")
                .font(DesignSystem.Font.tag)
                .foregroundStyle(DesignSystem.Color.rarityLegendary)
            Text("Legendary")
                .font(DesignSystem.Font.title)
                .foregroundStyle(DesignSystem.Color.brandWhite)
            HStack {
                Text("1,200 💎")
                    .font(DesignSystem.Font.bodyEmph)
                    .foregroundStyle(DesignSystem.Color.brandWhite)
                Spacer()
                Text("⏱ 02d 14h")
                    .font(DesignSystem.Font.caption)
                    .foregroundStyle(DesignSystem.Color.brandWhite.opacity(0.6))
            }
        }
        .padding(20)
        .background(LinearGradient(colors: [DesignSystem.Color.brandMagenta.opacity(0.4), DesignSystem.Color.bgElevated.opacity(0.6)], startPoint: .topLeading, endPoint: .bottomTrailing))
        .clipShape(RoundedRectangle(cornerRadius: DesignSystem.Radius.lg))
    }

    private func productRow(_ product: ShopProduct) -> some View {
        Button { deps.iap.purchase(product: product) } label: {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(product.name)
                        .font(DesignSystem.Font.bodyEmph)
                        .foregroundStyle(DesignSystem.Color.brandWhite)
                    if let rarity = product.rarity {
                        RarityChip(rarity: rarity)
                    }
                }
                Spacer()
                Text(product.priceLabel)
                    .font(DesignSystem.Font.bodyEmph)
                    .foregroundStyle(DesignSystem.Color.brandCyan)
            }
            .padding(14)
            .background(RoundedRectangle(cornerRadius: DesignSystem.Radius.md).fill(DesignSystem.Color.bgElevated.opacity(0.6)))
        }
        .buttonStyle(.plain)
    }
}
