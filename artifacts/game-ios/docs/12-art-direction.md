# 12 — Visual Art Direction

## Mood line

> Wet neon pavement at 2 AM. Holographic ad-walls reflecting in puddles. A rooftop wind
> tunnel. The thrum of a maglev. Then sudden silence as you ignite the jetpack and the
> city falls away below your hands.

The references that matter most:

- *Mirror's Edge Catalyst* (motion clarity, hand presence)
- *Cyberpunk 2077* (color temperature contrast, neon density)
- *Ghostrunner* (speed-line tension, panel-thin cuts)
- *Tron: Legacy* (geometric grid, monochrome panels with one accent)
- Tokyo Shibuya at night for shop/menu wallpaper plates

## Color system

A 5-palette system. Each biome owns one palette; UI overlays a sixth, brand palette.

| Palette | Hex (key tones) | Used by |
| --- | --- | --- |
| **Brand** | `#0A0A12`, `#15182B`, `#FF2D7E` (magenta), `#39E0FF` (cyan), `#F8F8FF` | UI, logos |
| Cyberpunk City | `#3A0CA3`, `#7209B7`, `#F72585`, `#4CC9F0` | biome 1 |
| Rooftop District | `#0E1726`, `#FF6700`, `#FFD60A`, `#94D2BD` | biome 2 |
| Futuristic Subway | `#0B132B`, `#1C2541`, `#3A506B`, `#5BC0BE` | biome 3 |
| Neon Highway | `#000814`, `#001D3D`, `#003566`, `#FFC300`, `#FFD60A` | biome 4 |
| Industrial Zone | `#1A1A1D`, `#4E4E50`, `#950740`, `#C3073F` | biome 5 |
| Floating Sky City | `#001233`, `#33415C`, `#5C677D`, `#979DAC`, `#7DCFB6` | biome 6 |

UI never uses biome palette to keep brand consistent. Biomes never use brand magenta to
avoid coin/UI color collision.

## Typography

| Token | Font | Use |
| --- | --- | --- |
| Display | **Eurostile Extended Heavy** | logo, headlines |
| Hud Numerals | **JetBrains Mono Bold** | score, distance, fuel |
| Body | **Inter** | menus, settings, descriptions |
| Tag | **Inter SemiBold ALL CAPS** | rarity chips, missions |

Tabular figures (`fontFeatures: [tnum]`) are mandatory for score / distance / coins. No
jitter.

## Iconography

- 24 px, 2 px stroke, rounded ends, subtle inner glow.
- All icons monochrome in the brand light + 1 accent for state.
- Source library: bespoke set of ~80 icons, exported as SF-Symbol-style assets.

## Materials

Three master shaders cover 90 % of the game:

1. **NeonPlanar** — emissive lines on matte panel. Tunable line color, density, scroll.
2. **WetGlossPBR** — high-roughness albedo with thin-film clearcoat. Used for streets.
3. **HoloAdvert** — emissive video texture with chromatic-aberration fringe.

Plus:
- **Player hands** — stylized PBR with custom rim light always pointing camera-forward.
- **Skyboxes** — procedurally-blended HDRIs, day/night cycle in 90 s.

## Lighting

- Each biome ships with **3 lighting presets** (dusk / midnight / storm) the streamer
  rotates between, weighted to time-of-day.
- 1 key directional + 4 emissive sources max per chunk.
- Bloom on emissive only (≥ 1.0 luminance), threshold tuned per biome.
- HDR rendering (`displayP3` color space, `wantsHDR = true`).

## VFX library

- **CoinSparkle** — small star burst, 80 ms, no audio (audio is shared one-shot).
- **NearMiss** — radial chromatic flash, 120 ms, vignette pulse, mid haptic.
- **JetpackTrail** — looping ribbon with rarity color, 6 trail presets.
- **JetpackIgnition** — full-screen flash, 180 ms, particle puff under hand.
- **CrashImpact** — slow-motion cut, broken-glass overlay, low-pass audio swell.
- **SkyLaneEnter** — light-tunnel zoom, 220 ms.

All VFX use **pooled** `SCNParticleSystem` instances; we do not allocate during gameplay.

## Camera language

| Moment | Camera move |
| --- | --- |
| Spawn | dolly-in from 0.3 m back to player eye, 600 ms |
| Sprint at v_max | tiny 0.3° barrel roll on lane snap, +2° FOV |
| Slide | drop to 0.6 m height, 0° pitch, 1° dutch tilt |
| Jump | 1.8 m up, 4° upward pitch peak |
| Jetpack ignite | FOV +8°, 180 ms freeze, then pull-back 0.4 m |
| Jetpack flight | gentle 1° rolling sway tied to climb input |
| Crash | slow-mo 0.3×, FOV −10°, RGB shift |
| End | rotate around player to portrait pose for shareable freeze frame |

Camera shake budget: max 4° angular, max 0.05 m positional, must respect *Reduced Motion*.

## UI motion

- **Easing**: cubic-out enter, cubic-in exit, ease-in-out for ticker.
- **Spring**: damping 0.78, response 0.32 — buttons settle in 250 ms.
- **Stagger**: 40 ms between adjacent grid items.
- **Number tickers**: `CountUpText` over 800 ms with cubic-out.
- **Glow loops**: 1.6 Hz pulse on primary CTA only.

## Asset pipeline

- 3D source: Blender + Substance Painter.
- Export: USDZ (preferred) or .scn for SceneKit.
- Texture compression: ASTC 6×6 LDR; 4×4 for hero hands.
- LODs: 3 per environment prop; 2 for hands.
- Polycounts:
  - hero hand glove: 3 000 tris each
  - environment prop hero: 2 500 tris
  - background prop: 800 tris
  - drone enemy: 1 200 tris
- Atlas everything below 1 000 tris into shared 2k atlases.

## Localization & cultural readability

- Avoid country-specific iconography on hazards.
- Currency icons are abstract (chip / byte glyph), not real-world coins.
- Reserve 30 % string-length headroom on every UI label for German, Russian, and Arabic.
- RTL layout supported in menus (HUD remains LTR-positioned).

## Brand extension

- Logo plays a **180 ms ignition animation** on app launch.
- Loading screens use a procedurally-animated grid of brand-cyan chevrons that resolve into
  the next screen — not a spinner.
- Marketing banners follow the same neon-glow + magenta-cyan duotone treatment.
