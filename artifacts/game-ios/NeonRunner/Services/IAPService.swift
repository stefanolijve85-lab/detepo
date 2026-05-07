//
//  IAPService.swift
//
//  StoreKit 2 wrapper. Minimal but production-shaped: transaction listener,
//  purchase, restore, server-side receipt validation, rewarded-ad stub.
//

import Foundation
import StoreKit

public struct ShopProduct: Identifiable, Hashable, Sendable {
    public let id: String
    public let name: String
    public let priceLabel: String
    public let category: ShopCategory
    public let rarity: JetpackRarity?
}

@MainActor
final class IAPService {
    private let backend: BackendClient
    private let analytics: AnalyticsDispatcher
    private var listenerTask: Task<Void, Never>?
    private var products: [String: Product] = [:]

    init(backend: BackendClient, analytics: AnalyticsDispatcher) {
        self.backend = backend
        self.analytics = analytics
    }

    func startTransactionListener() {
        listenerTask?.cancel()
        listenerTask = Task.detached(priority: .background) { [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                await self.handle(transaction: result)
            }
        }
    }

    func availableProducts(for category: ShopCategory) -> [ShopProduct] {
        // Catalog is hardcoded in v1; in production, server returns current
        // promotions + pricing.
        let catalog: [ShopProduct] = [
            ShopProduct(id: "chips_pack_xs", name: "80 Chips", priceLabel: "$0.99", category: .currency, rarity: nil),
            ShopProduct(id: "chips_pack_sm", name: "450 Chips", priceLabel: "$4.99", category: .currency, rarity: nil),
            ShopProduct(id: "chips_pack_md", name: "950 Chips", priceLabel: "$9.99", category: .currency, rarity: nil),
            ShopProduct(id: "chips_pack_lg", name: "2 100 Chips", priceLabel: "$19.99", category: .currency, rarity: nil),
            ShopProduct(id: "battlepass_premium", name: "Battle Pass — Premium", priceLabel: "$9.99", category: .featured, rarity: nil),
            ShopProduct(id: "starter_pack_v1", name: "Starter Pack", priceLabel: "$4.99", category: .featured, rarity: .epic),
            ShopProduct(id: "jp_neon_plasma_v1", name: "Neon Plasma Jetpack", priceLabel: "350 💎", category: .jetpacks, rarity: .rare),
            ShopProduct(id: "jp_quantum_v1", name: "Quantum Gravity", priceLabel: "950 💎", category: .jetpacks, rarity: .epic),
            ShopProduct(id: "jp_dragon_v1", name: "Legendary Dragon", priceLabel: "1 200 💎", category: .jetpacks, rarity: .legendary),
            ShopProduct(id: "glv_neon_pulse", name: "Neon Pulse Gloves", priceLabel: "200 💎", category: .gloves, rarity: .rare),
            ShopProduct(id: "trail_violet", name: "Violet Ribbon Trail", priceLabel: "120 💎", category: .trails, rarity: .rare),
        ]
        return catalog.filter { category == .featured ? $0.category == .featured : $0.category == category }
    }

    func purchase(productId: String) {
        Task { await purchase(product: ShopProduct(id: productId, name: productId, priceLabel: "", category: .featured, rarity: nil)) }
    }

    func purchase(product: ShopProduct) {
        Task {
            do {
                let storeProduct = try await loadProduct(id: product.id)
                let result = try await storeProduct.purchase()
                switch result {
                case .success(let verification):
                    let txn = try checkVerified(verification)
                    await deliver(transaction: txn)
                    await txn.finish()
                case .userCancelled:
                    analytics.log(.iapCancelled(productId: product.id))
                case .pending:
                    break
                @unknown default: break
                }
            } catch {
                analytics.log(.iapFailed(productId: product.id, error: error.localizedDescription))
            }
        }
    }

    func restore() async {
        try? await AppStore.sync()
    }

    func watchRewardedAd(completion: @MainActor @escaping (Bool) -> Void) async {
        // Wire to your rewarded-ad SDK (e.g. AdMob, ApplovinMAX). Stubbed:
        try? await Task.sleep(nanoseconds: 1_500_000_000)
        completion(true)
    }

    func shareReplay(summary: RunSummary) {
        // Compose a 9:16 video using ReplayKit-recorded clip + overlay; route
        // to UIActivityViewController. (Out of scope for this scaffold.)
    }

    // MARK: - Internal

    private func loadProduct(id: String) async throws -> Product {
        if let cached = products[id] { return cached }
        let fetched = try await Product.products(for: [id])
        guard let p = fetched.first else { throw URLError(.fileDoesNotExist) }
        products[id] = p
        return p
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let value): return value
        case .unverified: throw URLError(.userAuthenticationRequired)
        }
    }

    private func deliver(transaction: Transaction) async {
        do {
            // Send the JWS to backend for double-check + grant.
            _ = try await backend.postVoid("/api/game/v1/store/receipt", body: ["jws": transaction.jsonRepresentation.base64EncodedString()])
            analytics.log(.iapDelivered(productId: transaction.productID))
        } catch {
            analytics.log(.iapFailed(productId: transaction.productID, error: error.localizedDescription))
        }
    }

    private func handle(transaction result: VerificationResult<Transaction>) async {
        if case .verified(let txn) = result {
            await deliver(transaction: txn)
            await txn.finish()
        }
    }
}
