//
//  SettingsView.swift
//

import SwiftUI

struct SettingsView: View {
    @Environment(AppDependencies.self) private var deps

    var body: some View {
        ZStack {
            GradientBackground()
            Form {
                Section("Gameplay") {
                    Picker("Swipe sensitivity", selection: deps.settings.binding(\.swipeSensitivity)) {
                        Text("Low").tag(SwipeSensitivity.low)
                        Text("Standard").tag(SwipeSensitivity.standard)
                        Text("High").tag(SwipeSensitivity.high)
                    }
                    Toggle("Left-handed HUD", isOn: deps.settings.binding(\.leftHanded))
                }
                Section("Accessibility") {
                    Toggle("Reduced motion", isOn: deps.settings.binding(\.reducedMotion))
                    Toggle("High contrast", isOn: deps.settings.binding(\.highContrast))
                    Toggle("Subtitles for cues", isOn: deps.settings.binding(\.subtitlesForCues))
                    Picker("Colorblind mode", selection: deps.settings.binding(\.colorblindMode)) {
                        Text("Off").tag(ColorblindMode.off)
                        Text("Deuteranopia").tag(ColorblindMode.deuteranopia)
                        Text("Protanopia").tag(ColorblindMode.protanopia)
                        Text("Tritanopia").tag(ColorblindMode.tritanopia)
                    }
                    Slider(value: deps.settings.binding(\.hapticIntensity), in: 0...1) {
                        Text("Haptics intensity")
                    }
                }
                Section("Graphics") {
                    Picker("Frame rate", selection: deps.settings.binding(\.frameRate)) {
                        Text("60").tag(FrameRate.sixty); Text("120").tag(FrameRate.hundredTwenty)
                    }
                    Picker("Quality", selection: deps.settings.binding(\.qualityPreset)) {
                        Text("Low").tag(QualityPreset.low)
                        Text("Medium").tag(QualityPreset.medium)
                        Text("High").tag(QualityPreset.high)
                        Text("Ultra").tag(QualityPreset.ultra)
                    }
                    Toggle("Motion blur", isOn: deps.settings.binding(\.motionBlur))
                }
                Section("Audio") {
                    Slider(value: deps.settings.binding(\.masterVolume), in: 0...1) { Text("Master") }
                    Slider(value: deps.settings.binding(\.musicVolume), in: 0...1) { Text("Music") }
                    Slider(value: deps.settings.binding(\.sfxVolume), in: 0...1) { Text("SFX") }
                }
                Section("Account") {
                    Button("Sign in with Apple") { Task { await deps.gameCenter.signInWithApple() } }
                    Button("Restore purchases") { Task { await deps.iap.restore() } }
                    Button("Export my data (GDPR)") { Task { await deps.profileStore.exportData() } }
                    Button("Delete my account", role: .destructive) { Task { await deps.profileStore.deleteAccount() } }
                }
                Section("About") {
                    HStack { Text("Version"); Spacer(); Text(AppInfo.versionString).foregroundStyle(.secondary) }
                    NavigationLink("Privacy") { Text("…") }
                    NavigationLink("Terms") { Text("…") }
                    NavigationLink("Open source licenses") { Text("…") }
                }
            }
            .scrollContentBackground(.hidden)
        }
    }
}
