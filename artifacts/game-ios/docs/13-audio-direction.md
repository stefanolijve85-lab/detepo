# 13 — Audio Direction

## Vision

> If you close your eyes, you should still feel the speed.

The audio is **the** retention multiplier. It's how a 90-second run feels like a 4-minute
chase scene. Everything is layered, dynamic, and tactile.

## Music

### Dynamic stem-based score

Every track is composed in 5 stems:

1. **Pad / atmosphere** — always present, biome-coloured.
2. **Drum bus** — kicks in once `combo ≥ 5` or speed ≥ 18 m/s.
3. **Synth lead** — joins on jetpack ignition; ducks on crash.
4. **Arp / texture** — joins during near-miss streak ≥ 3 within 4 s.
5. **Riser / drop** — triggered by event windows (boss drone, sky lane entry, BP unlock).

Mixing is performed at runtime in `AdaptiveMusic.swift` using AVAudioEngine `AVAudioMixerNode`s
with linear ramps (50 ms, never zipper-noised).

### Tempo

- Base BPM 124. Stage 2 → 132. Stage 3 → 140. Jetpack adds +12 BPM via time-stretch
  (granular, AVAudioUnitTimePitch).
- Beat grid drives subtle camera bob harmonics (footsteps lock to half-beat).

### Track set per biome

| Biome | Track | Composer brief |
| --- | --- | --- |
| Cyberpunk City | "Neon Pulse" | downtempo synthwave → high-energy chiptune |
| Rooftop District | "Skyline Drive" | distorted lead, big drums, ambient choir pad |
| Subway | "Underground Velocity" | techno 4-on-floor, sub bass focus |
| Neon Highway | "Night Rider" | retrowave, gated reverb on snares |
| Industrial | "Iron Lung" | EBM, metallic percussion |
| Sky City | "Stratosphere" | trance, big supersaw arp |

## SFX taxonomy

| Cue | Length | Notes |
| --- | --- | --- |
| `coin_pickup` | 90 ms | bright, pitched higher every coin in 1.5 s window (max +5 semitones) |
| `coin_pickup_chip` | 240 ms | rare, sparkly, brand identity |
| `near_miss` | 280 ms | doppler whoosh + tiny vinyl crackle |
| `lane_snap` | 60 ms | tiny pitched tick |
| `jump` | 130 ms | tactile thump + cloth swish |
| `slide_start` | 180 ms | concrete scrape, low-passed |
| `slide_loop` | – | seamless loop while sliding |
| `jetpack_ignite` | 700 ms | layered: switch click, fuel ignite, sub-bass impact |
| `jetpack_loop` | – | granular loop, pitch follows climb-rate |
| `jetpack_sputter` | 600 ms | choke + cough + descending pitch |
| `crash_main` | 900 ms | impact + rebar stress + low-pass swell on music |
| `combo_tier_up` | 250 ms | clean rising pentatonic chord |
| `combo_break` | 320 ms | descending dissonance, short |
| `power_up_acquire` | 220 ms | one bell per power-up, distinct timbre |
| `revive_chance` | 1 200 ms | dramatic drone ramp, voice-pad |
| `level_up` | 1 800 ms | full triumphant sting, brass + supersaw |
| `bp_tier_up` | 600 ms | glassy chime + tonal bloom |
| `mission_complete` | 320 ms | neutral confirm, brand tone |
| `ui_tap` | 35 ms | brand click, tabular feel |
| `ui_back` | 50 ms | descending click |
| `ui_open_modal` | 180 ms | air-whoosh into reverb |

All SFX are **stereo, 48 kHz, 16-bit AIFF**, normalized to −12 LUFS short-term. We do
runtime peak limiting to −1 dBTP.

## Spatialization

- **Doppler** on world hazards (drones overtake left/right). Implemented via
  `AVAudio3DEnvironmentNode` with HRTF for headphones, panning fallback for speakers.
- Coins emit a positional 1-shot when collected — gives the *Mirror's Edge* "left ear right
  ear" parallax sense of speed.
- Wind noise scales with `speed_normalized^1.5` and pans with lane.

## Ducking & priorities

Music ducks when **gameplay-critical** SFX play:

| Cue | Music duck (dB) | Recovery (ms) |
| --- | --- | --- |
| `crash_main` | −12 | 1 200 (cinematic recover) |
| `jetpack_ignite` | −6 | 400 |
| `revive_chance` | −10 | – (held for modal) |
| `near_miss` | −1 | 80 (tiny breath) |
| `combo_tier_up` | −2 | 150 |

Implemented as keyframed gain ramps on the music bus.

## Voice (optional)

- Brief "GO!" at countdown end.
- Optional taunts (cosmetic) — short stylized vocal stings, customizable from Battle Pass
  unlocks. Off by default for new users; opt-in via Settings.
- No story voiceover. The game is wordless on purpose.

## Haptics

Defined in AHAP files in `Resources/Haptics/`. Each cue ships in **4 intensity levels**
controlled by Settings.

| Cue | Pattern |
| --- | --- |
| `coin` | Selection click |
| `near_miss` | Quick double pulse, sharp |
| `jetpack_ignite` | Sustained 220 ms transient with rising sharpness |
| `jump` | Light then medium impact |
| `slide_start` | Continuous low-frequency hum, 350 ms |
| `crash` | Heavy impact + 600 ms tremor |
| `combo_break` | Descending double tap |
| `level_up` | Triumphant cascade, 700 ms |

Haptics never duplicate audio; they **anticipate** or **complement** it. Off if device is
silent + user is in *Reduced Motion* mode.

## Mix targets

| Target | Value |
| --- | --- |
| Master | −16 LUFS integrated, −1 dBTP |
| Music bus | −20 LUFS |
| SFX bus | −18 LUFS short-term |
| Voice bus | −14 LUFS, sidechain duck −6 dB on overlap |

## Pipeline & tooling

- DAW: Reaper / Ableton.
- Stem export to `.aif` 48 kHz 16-bit, then converted to ASTC-friendly `.caf` for ship.
- AHAP authored in Apple's Haptic Composer (or hand-edited JSON).
- Audio QA: `AVAudioEngine` runs in a CI-friendly headless mode that asserts buffer
  underruns = 0 in 30 s deterministic playback.

## Accessibility

- All gameplay-critical audio cues have a paired visual cue (HUD chip or screen flash).
- "Subtitles for cues" setting renders short text labels (e.g. "⚠ DRONE LEFT") for
  off-screen hazards — vital for hard-of-hearing players.
- Spatial audio downgrades to stereo if user has mono-audio enabled in iOS accessibility.
