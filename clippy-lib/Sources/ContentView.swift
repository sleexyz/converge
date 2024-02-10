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
                if let cursorPosition = self?.getCursorPositionGlobal(event) {
                    self?.cursorPosition = cursorPosition
                }
            }
        }
    }

    private func getCursorPositionGlobal(_ event: NSEvent) -> CGPoint? {
        if event.window != nil {
            return event.locationInWindow
        }
        guard let window = self.window else { return nil }
        let locationInWindow = window.convertPoint(fromScreen: event.locationInWindow)
        return locationInWindow
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
                .fill(Color.white)
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
    var window: NSWindow
    var tracker: CursorTracker
    
    @State private var isHovered = false
    @StateObject var screenRecorder = ScreenRecorder()

    
    init(window: NSWindow) {
        self.window = window
        self.tracker = CursorTracker(window: window)
    }
    
    var body: some View {
        ZStack {
            // HStack {
            //     EyeView(tracker: tracker)
            //     EyeView(tracker: tracker)
            // }
            Color.clear
                .contentShape(Rectangle())

            screenRecorder.capturePreview
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .aspectRatio(screenRecorder.contentSize, contentMode: .fit)
                .padding(8)
        }
        .onTapGesture {
            print("click")
        }
        .onAppear {
            Task {
                if await screenRecorder.canRecord {
                    await screenRecorder.start()
                } 
            }
        }
        .opacity(isHovered ? 0 : 1) // Change opacity based on hover state
        .onHover { hover in
            withAnimation {
                self.isHovered = hover
            }
        }
    }
}
