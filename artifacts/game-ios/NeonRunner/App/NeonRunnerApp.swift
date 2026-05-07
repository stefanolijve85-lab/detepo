//
//  NeonRunnerApp.swift
//  Composition root + scene-phase wiring.
//

import SwiftUI

@main
struct NeonRunnerApp: App {
    @State private var deps = AppDependencies.live()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            AppRootView()
                .environment(deps)
                .preferredColorScheme(.dark)
                .statusBarHidden(true)
                .persistentSystemOverlays(.hidden) // hides the home indicator during gameplay
                .task { await deps.bootstrap() }
        }
        .onChange(of: scenePhase) { _, newPhase in
            deps.scene.handle(scenePhase: newPhase)
        }
    }
}
