//
//  ContentView.swift
//  clippy
//
//  Created by Sean Lee on 12/7/23.
//

import SwiftUI
import SwiftData

class CursorTracker: ObservableObject {
    @Published var cursorPosition: CGPoint = .zero
    var window: NSWindow?

    init(window: NSWindow?) {
        self.window = window
        setupTracking()
    }

    private func setupTracking() {
        NSEvent.addGlobalMonitorForEvents(matching: .mouseMoved) { [weak self] event in
            DispatchQueue.main.async {
                self?.updateCursorPosition(event)
            }
        }

        NSEvent.addLocalMonitorForEvents(matching: .mouseMoved) { [weak self] event in
            self?.updateCursorPosition(event)
            return event
        }
    }

    private func updateCursorPosition(_ event: NSEvent) {
        if event.window != nil {
            cursorPosition = event.locationInWindow
            return
        }
        guard let window = self.window else { return }
        let locationInScreen = NSRect(origin: event.locationInWindow, size: .zero)
        let locationInWindow = window.convertFromScreen(locationInScreen).origin
        cursorPosition = locationInWindow
    }
}

struct EyeView: View {
    @ObservedObject var tracker: CursorTracker

    func calculatePupilPosition(cursorPosition: CGPoint, eyeFrame: CGRect, maxPupilOffset: CGFloat) -> CGPoint {
        let eyeCenter = CGPoint(x: eyeFrame.midX, y: eyeFrame.midY)
        let deltaX = cursorPosition.x - eyeCenter.x
        let deltaY = cursorPosition.y - eyeCenter.y

        let angle = atan2(deltaY, deltaX)
        let distance = min(hypot(deltaX, deltaY), maxPupilOffset)

        let pupilX = cos(angle) * distance
        let pupilY = -sin(angle) * distance

        return CGPoint(x: pupilX, y: pupilY)
    }

    var body: some View {
        GeometryReader { geometry in
            // Define maxPupilOffset
            let maxPupilOffset: CGFloat = geometry.size.height / 2 * 0.4 // Adjust this value as needed

            // Calculate pupil position based on cursorPosition, geometry.frame and maxPupilOffset
            let pupilPosition = calculatePupilPosition(cursorPosition: tracker.cursorPosition, eyeFrame: geometry.frame(in: .global), maxPupilOffset: maxPupilOffset)
            // Create eye and pupil views
            Circle() // Eye
                .frame(width: geometry.size.width, height: geometry.size.height)
                .overlay(
                    Circle() // Pupil
                        .fill(Color.black)
                        .frame(width: geometry.size.width / 4, height: geometry.size.height / 4)
                        .offset(x: pupilPosition.x, y: pupilPosition.y)
                        .animation(.linear)
                )
        }
    }
}

struct ContentView: View {
    var tracker = CursorTracker(window: NSApplication.shared.windows.first)
    var body: some View {
        HStack {
            EyeView(tracker: tracker)
            EyeView(tracker: tracker)
        }
        .onTapGesture {
            print("click")
        }
    }
}
