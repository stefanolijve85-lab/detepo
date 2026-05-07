//
//  PushService.swift
//

import Foundation
import UserNotifications
import UIKit

@MainActor
final class PushService: NSObject {
    private let backend: BackendClient

    init(backend: BackendClient) {
        self.backend = backend
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }

    func requestAuthorizationIfNeeded() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .notDetermined else { return }
        _ = try? await center.requestAuthorization(options: [.alert, .badge, .sound, .providesAppNotificationSettings])
        await UIApplication.shared.registerForRemoteNotifications()
    }

    func register(deviceToken: Data) async {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        _ = try? await backend.postVoid("/api/game/v1/push/register", body: ["token": token, "platform": "apns"])
    }
}

extension PushService: UNUserNotificationCenterDelegate {
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .badge, .sound]
    }
}
