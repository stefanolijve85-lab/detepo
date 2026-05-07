//
//  ScenePhaseObserver.swift
//
//  Maps SwiftUI's `ScenePhase` to gameplay + analytics + cloud-save side-effects.
//

import SwiftUI

@MainActor
final class ScenePhaseObserver {
    private let session: GameSession
    private let cloudSave: CloudSaveService
    private let analytics: AnalyticsDispatcher

    init(session: GameSession, cloudSave: CloudSaveService, analytics: AnalyticsDispatcher) {
        self.session = session
        self.cloudSave = cloudSave
        self.analytics = analytics
    }

    func handle(scenePhase phase: ScenePhase) {
        switch phase {
        case .background:
            // Pause the loop, persist, fire-and-forget cloud sync.
            session.suspend(reason: .background)
            Task.detached(priority: .utility) { [cloudSave] in
                await cloudSave.flush()
            }
            analytics.log(.appBackgrounded)

        case .inactive:
            // Brief inactive (e.g. system sheet). Pause but do not persist yet.
            session.suspend(reason: .inactive)

        case .active:
            session.resumeFromSuspension()
            analytics.log(.appForegrounded)

        @unknown default:
            break
        }
    }
}
