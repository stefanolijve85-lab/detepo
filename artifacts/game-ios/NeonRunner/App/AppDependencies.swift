//
//  AppDependencies.swift
//
//  The composition root. The only place where concrete types are wired together.
//  Every other file in the app receives its dependencies via this container, which
//  makes testing + previewing trivial: build a `.preview()` instance with stubs.
//

import Foundation
import SwiftUI

@Observable
@MainActor
final class AppDependencies {

    // MARK: - Persistence
    let profileStore: ProfileStore
    let runHistoryStore: RunHistoryStore
    let settings: SettingsStore

    // MARK: - Services (I/O)
    let backend: BackendClient
    let leaderboard: LeaderboardService
    let gameCenter: GameCenterService
    let iap: IAPService
    let cloudSave: CloudSaveService
    let push: PushService
    let remoteConfig: RemoteConfigService

    // MARK: - Analytics
    let analytics: AnalyticsDispatcher

    // MARK: - Game runtime
    let session: GameSession
    let scene: ScenePhaseObserver

    // MARK: - Router
    let router: AppRouter

    private init(
        profileStore: ProfileStore,
        runHistoryStore: RunHistoryStore,
        settings: SettingsStore,
        backend: BackendClient,
        leaderboard: LeaderboardService,
        gameCenter: GameCenterService,
        iap: IAPService,
        cloudSave: CloudSaveService,
        push: PushService,
        remoteConfig: RemoteConfigService,
        analytics: AnalyticsDispatcher,
        session: GameSession,
        scene: ScenePhaseObserver,
        router: AppRouter
    ) {
        self.profileStore = profileStore
        self.runHistoryStore = runHistoryStore
        self.settings = settings
        self.backend = backend
        self.leaderboard = leaderboard
        self.gameCenter = gameCenter
        self.iap = iap
        self.cloudSave = cloudSave
        self.push = push
        self.remoteConfig = remoteConfig
        self.analytics = analytics
        self.session = session
        self.scene = scene
        self.router = router
    }

    /// Production wiring.
    static func live() -> AppDependencies {
        let env = AppEnv.current
        let analytics = AnalyticsDispatcher.live()

        let profileStore = ProfileStore.live()
        let runHistoryStore = RunHistoryStore.live()
        let settings = SettingsStore.live()

        let backend = BackendClient(
            baseURL: env.backendURL,
            tokenProvider: profileStore.tokenProvider(),
            analytics: analytics
        )

        let leaderboard = LeaderboardService(backend: backend)
        let gameCenter = GameCenterService()
        let iap = IAPService(backend: backend, analytics: analytics)
        let cloudSave = CloudSaveService(profileStore: profileStore)
        let push = PushService(backend: backend)
        let remoteConfig = RemoteConfigService(backend: backend)

        let bus = EventBus()
        let session = GameSession(
            bus: bus,
            settings: settings,
            profileStore: profileStore,
            runHistoryStore: runHistoryStore,
            leaderboard: leaderboard,
            gameCenter: gameCenter,
            analytics: analytics,
            remoteConfig: remoteConfig
        )

        let router = AppRouter()
        let scene = ScenePhaseObserver(session: session, cloudSave: cloudSave, analytics: analytics)

        return AppDependencies(
            profileStore: profileStore,
            runHistoryStore: runHistoryStore,
            settings: settings,
            backend: backend,
            leaderboard: leaderboard,
            gameCenter: gameCenter,
            iap: iap,
            cloudSave: cloudSave,
            push: push,
            remoteConfig: remoteConfig,
            analytics: analytics,
            session: session,
            scene: scene,
            router: router
        )
    }

    /// First-launch + cold-start wiring. Idempotent; safe to call repeatedly.
    func bootstrap() async {
        analytics.log(.appLaunched(coldStart: true))

        // Load profile from disk first so the menu can paint immediately.
        await profileStore.loadFromDisk()

        // Game Center is best-effort; sign-in failure must never block the UI.
        async let gc: Void = gameCenter.authenticateIfPossible()

        // Remote config + cloud sync run in parallel; both have safe fallbacks.
        async let rc: Void = remoteConfig.refresh()
        async let cs: Void = cloudSave.reconcile()

        // StoreKit 2 transaction listener must be running before any IAP can happen.
        iap.startTransactionListener()

        _ = await (gc, rc, cs)
    }
}

// MARK: - App environment

enum AppEnv {
    case debug, beta, release

    static let current: AppEnv = {
        #if DEBUG
        return .debug
        #elseif BETA
        return .beta
        #else
        return .release
        #endif
    }()

    var backendURL: URL {
        switch self {
        case .debug:   return URL(string: "http://localhost:8787")!
        case .beta:    return URL(string: "https://api.staging.neonrunner.app")!
        case .release: return URL(string: "https://api.neonrunner.app")!
        }
    }

    var allowsCheats: Bool {
        switch self {
        case .debug:   return true
        case .beta:    return ProcessInfo.processInfo.environment["NEON_CHEATS"] == "1"
        case .release: return false
        }
    }
}
