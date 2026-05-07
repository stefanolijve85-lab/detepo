//
//  GameView.swift
//
//  Hosts the SCNView + the HUD overlay + the gesture surface that feeds input
//  into SwipeInputHandler.
//

import SwiftUI
import SceneKit

struct GameView: View {
    let session: GameSession

    var body: some View {
        ZStack {
            SCNViewRepresentable(scene: session.sceneRenderer.scene)

            // Gesture surface — full screen, transparent.
            GameInteractionView(session: session)

            // HUD on top
            HUDView(snapshot: session.hud, countdown: countdownValue)

            // Pause / Menu fly-in could live here.
            VStack {
                HStack {
                    Spacer()
                    Button {
                        // Open pause menu (out of scope of this snippet)
                    } label: {
                        Image(systemName: "pause.fill")
                            .padding(10)
                            .background(Circle().fill(DesignSystem.Color.bgElevated.opacity(0.6)))
                    }
                    .padding(.top, 64)
                    .padding(.trailing, 14)
                }
                Spacer()
            }
        }
    }

    private var countdownValue: Double? {
        if case let .countdown(remaining) = session.state { return remaining }
        return nil
    }
}

private struct SCNViewRepresentable: UIViewRepresentable {
    let scene: SCNScene

    func makeUIView(context: Context) -> SCNView {
        let view = SCNView()
        view.scene = scene
        view.isPlaying = true
        view.antialiasingMode = .multisampling2X
        view.preferredFramesPerSecond = 120
        view.backgroundColor = .black
        view.allowsCameraControl = false
        return view
    }

    func updateUIView(_ uiView: SCNView, context: Context) { /* nothing */ }
}

private struct GameInteractionView: UIViewRepresentable {
    let session: GameSession

    func makeUIView(context: Context) -> UIView {
        let view = TouchSurfaceView()
        view.session = session
        view.backgroundColor = .clear
        view.isMultipleTouchEnabled = true
        let pan = UIPanGestureRecognizer(target: view, action: #selector(TouchSurfaceView.handlePan(_:)))
        pan.minimumNumberOfTouches = 1
        view.addGestureRecognizer(pan)

        let twoFingerTap = UITapGestureRecognizer(target: view, action: #selector(TouchSurfaceView.handleTwoFingerTap(_:)))
        twoFingerTap.numberOfTouchesRequired = 2
        view.addGestureRecognizer(twoFingerTap)

        let longPress = UILongPressGestureRecognizer(target: view, action: #selector(TouchSurfaceView.handleLongPress(_:)))
        longPress.minimumPressDuration = 0.05
        view.addGestureRecognizer(longPress)

        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) { (uiView as? TouchSurfaceView)?.session = session }
}

private final class TouchSurfaceView: UIView {
    weak var session: GameSession?

    @objc func handlePan(_ recognizer: UIPanGestureRecognizer) {
        switch recognizer.state {
        case .ended:
            let t = recognizer.translation(in: self)
            let v = recognizer.velocity(in: self)
            session?.onSwipe(directionFor(translation: t))
            _ = v
        default: break
        }
    }

    private func directionFor(translation: CGPoint) -> SwipeDirection {
        if abs(translation.x) > abs(translation.y) {
            return translation.x > 0 ? .right : .left
        } else {
            return translation.y > 0 ? .down : .up
        }
    }

    @objc func handleTwoFingerTap(_ recognizer: UITapGestureRecognizer) {
        session?.onTwoFingerTap()
    }

    @objc func handleLongPress(_ recognizer: UILongPressGestureRecognizer) {
        switch recognizer.state {
        case .began:    session?.onJetpackHold(true)
        case .ended, .cancelled, .failed: session?.onJetpackHold(false)
        default: break
        }
    }
}
