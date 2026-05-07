//
//  SystemRegistry.swift
//
//  Holds and orchestrates all gameplay systems. The simulation kernel.
//
//  Order of `tick(dt:time:)` matters and is documented inline — most bugs in
//  endless runners come from mis-ordered systems (e.g. score reading position
//  before player updates it on the same frame).
//

import Foundation

@MainActor
final class SystemRegistry {

    // MARK: - Sub-systems
    let input: SwipeInputHandler
    let player: PlayerController
    let camera: FirstPersonCamera
    let world: ChunkStreamer
    let obstacles: ObstacleSpawner
    let pickups: PickupRegistry
    let powerUps: PowerUpStack
    let jetpack: JetpackSystem
    let score: ScoreSystem
    let combo: ComboTracker
    let audio: AudioDirector
    let vfx: VFXLibrary
    let difficulty: DifficultyCurve
    let missions: MissionEngine
    let analyticsRelay: AnalyticsRelay
    let sceneRenderer: SceneRendererBridge
    let bus: EventBus

    // MARK: - State
    private(set) var lastObstacleArchetype: ObstacleArchetype?
    private var subscriptions: [AnyCancellableEventToken] = []
    private let onHUDUpdate: (HUDSnapshot) -> Void
    private let onDeath: (DeathCause) -> Void
    private let settings: SettingsStore

    init(
        bus: EventBus,
        clock: GameClock,
        settings: SettingsStore,
        remoteConfig: RemoteConfigService,
        profileStore: ProfileStore,
        onHUDUpdate: @escaping (HUDSnapshot) -> Void,
        onDeath: @escaping (DeathCause) -> Void
    ) {
        self.bus = bus
        self.settings = settings
        self.onHUDUpdate = onHUDUpdate
        self.onDeath = onDeath

        // Core systems — order matters. Construct dependents last.
        self.sceneRenderer = SceneRendererBridge()
        self.vfx = VFXLibrary(scene: sceneRenderer)
        self.audio = AudioDirector(settings: settings)
        self.input = SwipeInputHandler(settings: settings)
        self.difficulty = DifficultyCurve(remoteConfig: remoteConfig)
        self.player = PlayerController(input: input, scene: sceneRenderer)
        self.camera = FirstPersonCamera(scene: sceneRenderer, player: player, settings: settings)
        self.world = ChunkStreamer(scene: sceneRenderer)
        self.obstacles = ObstacleSpawner(world: world, difficulty: difficulty)
        self.pickups = PickupRegistry(world: world, bus: bus)
        self.powerUps = PowerUpStack(bus: bus)
        self.jetpack = JetpackSystem(catalog: JetpackCatalog.shared, bus: bus, scene: sceneRenderer)
        self.combo = ComboTracker(bus: bus)
        self.score = ScoreSystem(combo: combo, powerUps: powerUps, bus: bus)
        self.missions = MissionEngine(profileStore: profileStore, bus: bus)
        self.analyticsRelay = AnalyticsRelay(bus: bus)

        wireEventHandlers()
    }

    private func wireEventHandlers() {
        // Death detection: physics + jetpack systems publish .crashed; we react here.
        subscriptions.append(bus.subscribe { [weak self] event in
            guard let self else { return }
            switch event {
            case .crashed(let archetype):
                self.lastObstacleArchetype = archetype
                self.onDeath(.crash)
            default:
                break
            }
        })
    }

    // MARK: - Lifecycle

    func reset(seed: UInt64, equippedJetpackId: String) {
        difficulty.reset()
        world.reset(seed: seed)
        obstacles.reset(seed: seed)
        pickups.reset(seed: seed)
        powerUps.reset()
        combo.reset()
        score.reset()
        player.reset()
        camera.reset()
        jetpack.equip(catalogId: equippedJetpackId)
        jetpack.reset()
        missions.beginRun()
        audio.beginRun(biome: .cyberCity)
        vfx.reset()
        sceneRenderer.beginRun(biome: .cyberCity)
        publishHUD()
    }

    /// Called from the GameLoop. Order is critical — see comments per line.
    func tick(dt: TimeInterval, time: GameTime) {
        // 1. Input is gathered first so player + jetpack systems read the
        //    same input snapshot for this tick.
        input.beginTick()

        // 2. Difficulty drives speed targets the player honors.
        difficulty.tick(dt: dt, time: time)

        // 3. Player kinematics (lane snap, jump, slide). May feed jetpack.
        player.tick(dt: dt, time: time, targetSpeed: difficulty.currentSpeed)

        // 4. Jetpack consumes input; if active, it overrides vertical motion.
        jetpack.tick(dt: dt, time: time, input: input.jetpackInput, player: player)

        // 5. Camera follows post-physics position so head-bob feels grounded.
        camera.tick(dt: dt, time: time, player: player, jetpack: jetpack)

        // 6. World streams ahead of player; new chunks register with obstacle
        //    spawner and pickup registry.
        world.tick(playerZ: player.position.z, biome: currentBiome())

        // 7. Obstacles + pickups are step-resolved; collision events publish on bus.
        obstacles.tick(dt: dt, time: time, player: player, jetpack: jetpack)
        pickups.tick(dt: dt, time: time, player: player, magnetActive: powerUps.isActive(.coinMagnet))

        // 8. Combo + power-up timers tick before score so the score uses
        //    up-to-date multiplier values.
        combo.tick(dt: dt, time: time)
        powerUps.tick(dt: dt, time: time)

        // 9. Score system aggregates this frame's events into the canonical score.
        score.tick(dt: dt, time: time, distance: player.distanceTraveledMeters)

        // 10. Missions react to events (already published) and persist progress.
        missions.tick()

        // 11. Audio mixes intensity based on speed + combo + jetpack.
        audio.tick(dt: dt, intensity: difficulty.intensityNormalized, comboTier: combo.tier, jetpackActive: jetpack.isFlying)

        // 12. VFX update (pooled particles, screen shake).
        vfx.tick(dt: dt, time: time)

        // 13. Publish HUD snapshot.
        publishHUD()

        input.endTick()
    }

    func applyRevive() {
        // Move player back a few meters, grant short shield, re-arm.
        player.reviveOffset()
        powerUps.grant(.shield, duration: 4.0)
        camera.cinematicReviveZoom()
        audio.playReviveSting()
    }

    func tearDownScene() {
        sceneRenderer.tearDown()
    }

    // MARK: - Helpers

    private func currentBiome() -> BiomeID {
        difficulty.currentBiome
    }

    private func publishHUD() {
        let snapshot = HUDSnapshot(
            score: score.canonicalScore,
            scoreDelta: score.lastFrameDelta,
            distanceMeters: Int(player.distanceTraveledMeters),
            coins: pickups.coinsCollected,
            chips: pickups.chipsCollected,
            comboTier: combo.tier,
            comboMultiplier: combo.multiplier,
            comboFraction: combo.timeFraction,
            activePowerUps: powerUps.activeSnapshots,
            jetpackFuel: jetpack.fuelRemaining,
            jetpackCapacity: jetpack.equipped.fuelCapacity,
            jetpackActive: jetpack.isFlying,
            speedMps: player.currentSpeed,
            biome: currentBiome()
        )
        onHUDUpdate(snapshot)
    }

    func buildSummary(cause: DeathCause, startedAt: Date, endedAt: Date, seed: UInt64) -> RunSummary {
        let duration = max(0.001, endedAt.timeIntervalSince(startedAt))
        return RunSummary(
            id: ULID().stringValue,
            seed: seed,
            startedAt: startedAt,
            endedAt: endedAt,
            durationMs: Int(duration * 1000),
            distanceCm: Int(player.distanceTraveledMeters * 100),
            coins: pickups.coinsCollected,
            chips: pickups.chipsCollected,
            scoreClient: score.canonicalScore,
            comboMax: combo.tierMax,
            nearMisses: obstacles.nearMissCount,
            causeOfDeath: cause,
            biomePath: world.visitedBiomes,
            jetpackTimeMs: Int(jetpack.totalFlightSeconds * 1000),
            powerUpsUsed: powerUps.usedThisRun,
            clientVersion: AppInfo.versionString,
            deviceModel: AppInfo.deviceModel
        )
    }
}
