//
//  GameSession.swift
//
//  Façade for a single game session, observable by SwiftUI. Owns the simulation
//  state machine and coordinates the game loop with the rest of the app.
//
//  This is intentionally the *only* type the UI imports from the Game layer.
//

import Foundation
import SwiftUI

public enum SessionState: Equatable, Sendable {
    case idle
    case countdown(secondsRemaining: Double)
    case running
    case dying
    case revivePrompt
    case ended(summary: RunSummary)

    public var isInGameOrCountdown: Bool {
        switch self {
        case .countdown, .running, .dying, .revivePrompt: return true
        default: return false
        }
    }
}

public enum SuspendReason { case background, inactive, menu }

@Observable
@MainActor
final class GameSession {
    // MARK: - Public observable state
    private(set) var state: SessionState = .idle
    private(set) var hud = HUDSnapshot.empty
    private(set) var equippedJetpackId: String = "jp_basic_v1"

    // MARK: - Dependencies
    private let bus: EventBus
    private let settings: SettingsStore
    private let profileStore: ProfileStore
    private let runHistoryStore: RunHistoryStore
    private let leaderboard: LeaderboardService
    private let gameCenter: GameCenterService
    private let analytics: AnalyticsDispatcher
    private let remoteConfig: RemoteConfigService

    // MARK: - Runtime
    private let clock = GameClock()
    private var loop: GameLoop!
    private var systems: SystemRegistry!
    private var currentSeed: UInt64 = 0
    private var startedAt: Date = .distantPast
    private var revivesUsed: Int = 0
    private var suspendStack: [SuspendReason] = []

    // MARK: - Init

    init(
        bus: EventBus,
        settings: SettingsStore,
        profileStore: ProfileStore,
        runHistoryStore: RunHistoryStore,
        leaderboard: LeaderboardService,
        gameCenter: GameCenterService,
        analytics: AnalyticsDispatcher,
        remoteConfig: RemoteConfigService
    ) {
        self.bus = bus
        self.settings = settings
        self.profileStore = profileStore
        self.runHistoryStore = runHistoryStore
        self.leaderboard = leaderboard
        self.gameCenter = gameCenter
        self.analytics = analytics
        self.remoteConfig = remoteConfig

        self.systems = SystemRegistry(
            bus: bus,
            clock: clock,
            settings: settings,
            remoteConfig: remoteConfig,
            profileStore: profileStore,
            onHUDUpdate: { [weak self] snapshot in self?.hud = snapshot },
            onDeath: { [weak self] cause in self?.handleDeath(cause: cause) }
        )

        self.loop = GameLoop(clock: clock, tick: { [weak self] dt, time in
            self?.systems.tick(dt: dt, time: time)
        })
    }

    // MARK: - Lifecycle

    /// Starts a new run from the menu. Triggers a 3-2-1 countdown.
    func startRun(seed: UInt64? = nil) {
        guard case .idle = state else { return }

        let resolvedSeed = seed ?? UInt64.random(in: 0...UInt64.max)
        currentSeed = resolvedSeed
        startedAt = Date()
        revivesUsed = 0

        clock.reset()
        systems.reset(seed: resolvedSeed, equippedJetpackId: equippedJetpackId)

        state = .countdown(secondsRemaining: 3.0)
        bus.publish(.runStarted(seed: resolvedSeed))
        analytics.log(.runStarted(seed: resolvedSeed, biome: .cyberCity))

        // Start countdown driver. Drives the loop only after countdown completes.
        Task { @MainActor in
            for tick in stride(from: 3.0, through: 0.0, by: -0.05) {
                if case .countdown = state {} else { return }
                state = .countdown(secondsRemaining: max(0, tick))
                try? await Task.sleep(nanoseconds: 50_000_000)
            }
            beginActiveRun()
        }
    }

    private func beginActiveRun() {
        guard case .countdown = state else { return }
        state = .running
        loop.start()
    }

    /// Player dies. Triggers revive prompt if eligible.
    private func handleDeath(cause: DeathCause) {
        guard case .running = state else { return }
        state = .dying
        loop.suspend()
        bus.publish(.crashed(against: systems.lastObstacleArchetype ?? .barrier))

        if eligibleForRevive {
            state = .revivePrompt
            // UI presents the revive modal; auto-dismisses to .ended after 5 s
            // unless `acceptRevive` is called.
            Task { @MainActor in
                try? await Task.sleep(nanoseconds: 5_000_000_000)
                if case .revivePrompt = state {
                    self.endRun(cause: cause)
                }
            }
        } else {
            endRun(cause: cause)
        }
    }

    private var eligibleForRevive: Bool {
        revivesUsed < remoteConfig.value(.maxRevivesPerRun, default: 2)
    }

    func acceptRevive(method: ReviveMethod) {
        guard case .revivePrompt = state else { return }
        revivesUsed += 1
        bus.publish(.revived)
        systems.applyRevive()
        state = .running
        loop.resume()
        analytics.log(.runRevived(method: method, count: revivesUsed))
    }

    func declineRevive() {
        guard case .revivePrompt = state else { return }
        endRun(cause: .crash)
    }

    private func endRun(cause: DeathCause) {
        loop.stop()
        let endedAt = Date()
        let summary = systems.buildSummary(
            cause: cause,
            startedAt: startedAt,
            endedAt: endedAt,
            seed: currentSeed
        )
        state = .ended(summary: summary)
        bus.publish(.runEnded(cause: cause, summary: summary))
        analytics.log(.runEnded(summary: summary))

        Task { @MainActor in
            // Persist locally first, then submit to backend.
            await runHistoryStore.append(summary)
            await profileStore.applyRunRewards(summary: summary)
            do {
                let response = try await leaderboard.submit(run: summary)
                analytics.log(.runSubmitted(rankGlobal: response.rankGlobal))
            } catch {
                analytics.log(.runSubmitFailed(error: error.localizedDescription))
            }
            await gameCenter.submitIfBest(score: summary.scoreClient)
        }
    }

    /// Returns to menu.
    func dismissEndOfRun() {
        guard case .ended = state else { return }
        state = .idle
        systems.tearDownScene()
    }

    // MARK: - Suspension (background, inactive, system sheet)

    func suspend(reason: SuspendReason) {
        suspendStack.append(reason)
        loop.suspend()
        clock.pause()
    }

    func resumeFromSuspension() {
        if !suspendStack.isEmpty { suspendStack.removeLast() }
        guard suspendStack.isEmpty else { return }
        clock.resume()
        if case .running = state { loop.resume() }
    }

    // MARK: - Player input passthrough

    func onSwipe(_ direction: SwipeDirection) { systems.input.handleSwipe(direction) }
    func onTwoFingerTap()                     { systems.input.handleTwoFingerTap() }
    func onJetpackHold(_ active: Bool)        { systems.input.setJetpackThrust(active) }

    // MARK: - Loadout

    func equipJetpack(catalogId: String) {
        equippedJetpackId = catalogId
        analytics.log(.equipJetpack(id: catalogId))
    }

    // MARK: - SceneKit accessors (used by GameView only)

    var sceneRenderer: SceneRendererBridge { systems.sceneRenderer }
}

public enum ReviveMethod: String, Sendable, Codable { case ad, chips }
