//
//  GameCenterService.swift
//
//  Wraps GameKit. Best-effort — sign-in failure must never block the UI.
//

import Foundation
import GameKit
import UIKit

@MainActor
final class GameCenterService {
    private(set) var isAuthenticated: Bool = false
    private(set) var localPlayer: GKLocalPlayer { GKLocalPlayer.local }
    private var lastSubmittedScore: Int = 0

    static let weeklyLeaderboardId = "neonrunner.weekly"
    static let alltimeLeaderboardId = "neonrunner.alltime"

    func authenticateIfPossible() async {
        await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
            GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, _ in
                Task { @MainActor in
                    if let vc = viewController {
                        // Present the auth flow, but don't gate the UI on it.
                        UIApplication.shared.connectedScenes
                            .compactMap { $0 as? UIWindowScene }
                            .first?.windows.first?.rootViewController?.present(vc, animated: true)
                    } else {
                        self?.isAuthenticated = GKLocalPlayer.local.isAuthenticated
                        cont.resume()
                    }
                }
            }
        }
    }

    func signInWithApple() async {
        // Sign-in-with-Apple kicks off via ASAuthorizationAppleIDProvider — out of
        // scope of this service (the service holds the result token).
    }

    func submitIfBest(score: Int) async {
        guard isAuthenticated, score > lastSubmittedScore else { return }
        lastSubmittedScore = score
        try? await GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local,
                                             leaderboardIDs: [Self.weeklyLeaderboardId, Self.alltimeLeaderboardId])
    }
}
