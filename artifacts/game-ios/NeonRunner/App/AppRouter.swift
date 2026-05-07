//
//  AppRouter.swift
//
//  Single source of truth for navigation. Views read .destination and bind sheets
//  + push paths to it. Routing is data-first so it can be unit-tested without UI.
//

import SwiftUI

@Observable
@MainActor
final class AppRouter {
    enum Tab: Hashable {
        case home
        case leaderboard
        case battlePass
        case settings
    }

    enum Sheet: Identifiable, Hashable {
        case shop
        case missions
        case endOfRun(RunSummary)
        case revivePrompt
        case productPreview(productId: String)

        var id: String {
            switch self {
            case .shop: return "shop"
            case .missions: return "missions"
            case .endOfRun(let s): return "endOfRun-\(s.id)"
            case .revivePrompt: return "revive"
            case .productPreview(let pid): return "preview-\(pid)"
            }
        }
    }

    var tab: Tab = .home
    var sheet: Sheet?
    var path: [Destination] = []

    enum Destination: Hashable {
        case shop
        case shopCategory(ShopCategory)
        case battlePass
        case missions
        case settings
        case leaderboard(scope: LeaderboardScope)
    }

    func push(_ d: Destination) { path.append(d) }
    func pop() { _ = path.popLast() }
    func reset() { path.removeAll(); sheet = nil; tab = .home }
    func present(_ s: Sheet) { sheet = s }
    func dismissSheet() { sheet = nil }
}

// MARK: - Sub-types referenced by routes

enum ShopCategory: String, Hashable {
    case featured, jetpacks, gloves, trails, currency
}
