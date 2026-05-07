//
//  AnalyticsRelay.swift
//
//  Translates event-bus events into analytics events. Decouples gameplay code
//  from the analytics taxonomy so we can re-shape events without churning game code.
//

import Foundation

@MainActor
final class AnalyticsRelay {
    private let bus: EventBus
    private var subs: [AnyCancellableEventToken] = []

    init(bus: EventBus) {
        self.bus = bus
        subs.append(bus.subscribe { event in
            // We funnel into the global dispatcher; AnalyticsDispatcher.shared is
            // sampled for Mixpanel and unsampled for our first-party warehouse.
            AnalyticsDispatcher.shared.logFromBus(event)
        })
    }
}
