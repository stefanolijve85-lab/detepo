//
//  AppRootView.swift
//
//  The top-level view. Owns the tab bar, navigation stack, and the gameplay overlay
//  that takes over the screen when a run is active.
//

import SwiftUI

struct AppRootView: View {
    @Environment(AppDependencies.self) private var deps

    var body: some View {
        ZStack {
            // Base UI: tab bar, menus, profile.
            menuShell

            // Gameplay overlay. Conditionally rendered so we don't pay
            // the SceneKit / Metal cost while in menus.
            if deps.session.state.isInGameOrCountdown {
                GameView(session: deps.session)
                    .ignoresSafeArea()
                    .transition(.opacity.combined(with: .scale(scale: 1.04)))
            }
        }
        .animation(.easeInOut(duration: 0.4), value: deps.session.state.isInGameOrCountdown)
        .background(DesignSystem.Color.bgBase.ignoresSafeArea())
    }

    @ViewBuilder
    private var menuShell: some View {
        @Bindable var router = deps.router

        TabView(selection: $router.tab) {
            NavigationStack(path: $router.path) {
                MainMenuView()
                    .navigationDestination(for: AppRouter.Destination.self, destination: routeDestination)
            }
            .tabItem { Label("Home", systemImage: "play.fill") }
            .tag(AppRouter.Tab.home)

            NavigationStack {
                LeaderboardView(scope: .global)
            }
            .tabItem { Label("Leaders", systemImage: "trophy.fill") }
            .tag(AppRouter.Tab.leaderboard)

            NavigationStack {
                BattlePassView()
            }
            .tabItem { Label("Pass", systemImage: "star.fill") }
            .tag(AppRouter.Tab.battlePass)

            NavigationStack {
                SettingsView()
            }
            .tabItem { Label("Settings", systemImage: "gearshape.fill") }
            .tag(AppRouter.Tab.settings)
        }
        .tint(DesignSystem.Color.brandMagenta)
        .sheet(item: $router.sheet, content: routeSheet)
    }

    @ViewBuilder
    private func routeDestination(_ d: AppRouter.Destination) -> some View {
        switch d {
        case .shop:                   ShopView()
        case .shopCategory(let cat):  ShopView(initialCategory: cat)
        case .battlePass:             BattlePassView()
        case .missions:               MissionsView()
        case .settings:               SettingsView()
        case .leaderboard(let scope): LeaderboardView(scope: scope)
        }
    }

    @ViewBuilder
    private func routeSheet(_ s: AppRouter.Sheet) -> some View {
        switch s {
        case .shop:               ShopView()
        case .missions:           MissionsView()
        case .endOfRun(let r):    EndOfRunView(summary: r)
        case .revivePrompt:       ReviveModalView()
        case .productPreview(let pid): ProductPreviewView(productId: pid)
        }
    }
}
