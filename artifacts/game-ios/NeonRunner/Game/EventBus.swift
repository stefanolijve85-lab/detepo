//
//  EventBus.swift
//
//  Synchronous, main-thread, in-memory pub/sub for gameplay events.
//
//  Why synchronous? We need ordering guarantees. If a coin pickup fires *before*
//  the score system's tick processes the previous frame, combo bonuses go missing.
//  Subscribers must therefore return fast (<100 µs) or hop to their own queue.
//

import Foundation

/// A lightweight gameplay event. Strongly typed so analytics + audio + HUD can
/// subscribe without stringly-typed lookups.
public enum GameEvent: Sendable, Hashable {
    case runStarted(seed: UInt64)
    case runEnded(cause: DeathCause, summary: RunSummary)
    case obstacleSpawned(id: ObstacleID, lane: Int, archetype: ObstacleArchetype)
    case nearMiss(id: ObstacleID, distance: Float)
    case coinCollected(amount: Int, position: Vec3)
    case chipCollected(amount: Int)
    case powerUpCollected(kind: PowerUpKind, durationRemaining: TimeInterval)
    case powerUpExpired(kind: PowerUpKind)
    case jetpackCollected(catalogId: String)
    case jetpackIgnited(catalogId: String)
    case jetpackFuelLow
    case jetpackSputter
    case jetpackLanded(durationFlown: TimeInterval, distanceFlown: Float, coinsCollected: Int)
    case comboTierUp(tier: Int)
    case comboBroken(previousTier: Int)
    case laneChanged(from: Int, to: Int)
    case jumped
    case slid
    case crashed(against: ObstacleArchetype)
    case revived
    case missionProgress(missionId: String, progress: Int, target: Int)
    case missionComplete(missionId: String)
    case battlePassXP(amount: Int)
    case xpEarned(amount: Int)
    case currencyEarned(bytes: Int, chips: Int)
    case biomeEntered(name: String)
}

@MainActor
final class EventBus {
    typealias Handler = (GameEvent) -> Void

    private final class Token {
        var handler: Handler?
        init(_ h: @escaping Handler) { self.handler = h }
    }

    private var subscribers: [ObjectIdentifier: Token] = [:]

    /// Subscribe; returns a cancellable that *must* be retained by the caller.
    @discardableResult
    func subscribe(_ handler: @escaping Handler) -> AnyCancellableEventToken {
        let token = Token(handler)
        let id = ObjectIdentifier(token)
        subscribers[id] = token
        return AnyCancellableEventToken { [weak self] in
            self?.subscribers.removeValue(forKey: id)
        }
    }

    func publish(_ event: GameEvent) {
        // Snapshot to allow handlers to (un)subscribe during dispatch.
        let snapshot = subscribers.values
        for token in snapshot {
            token.handler?(event)
        }
    }
}

/// RAII-style cancellable. Drop the reference to unsubscribe.
final class AnyCancellableEventToken {
    private let onCancel: () -> Void
    init(_ onCancel: @escaping () -> Void) { self.onCancel = onCancel }
    deinit { onCancel() }
    func cancel() { onCancel() }
}
