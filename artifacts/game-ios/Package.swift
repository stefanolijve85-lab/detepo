// swift-tools-version: 5.9
//
// Package manifest for the NeonRunner iOS app target. In production we ship
// from Xcode (because the app needs entitlements + StoreKit configuration files
// + xcassets), but this manifest lets CI run unit tests on a Linux-friendly
// subset of the runtime (deterministic systems only).
//

import PackageDescription

let package = Package(
    name: "NeonRunner",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "NeonRunner", targets: ["NeonRunner"]),
    ],
    targets: [
        .target(
            name: "NeonRunner",
            path: "NeonRunner"
        ),
        .testTarget(
            name: "NeonRunnerTests",
            dependencies: ["NeonRunner"],
            path: "NeonRunnerTests"
        )
    ]
)
