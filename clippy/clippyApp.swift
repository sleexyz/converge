//
//  clippyApp.swift
//  clippy
//
//  Created by Sean Lee on 12/7/23.
//

import SwiftUI
import SwiftData
import AppKit


@main
struct clippyApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    @State private var dragAmount = CGSize.zero

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            Item.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        Settings {
            ContentView()
        }
        .modelContainer(sharedModelContainer)
    }
}

class DraggableHostingView<Content>: NSHostingView<Content> where Content: View {
    override var mouseDownCanMoveWindow: Bool {
        return NSEvent.modifierFlags.contains(.command)
    }
}

class InspectorPanel : NSPanel {

  override func awakeFromNib() {
    super.awakeFromNib()
    becomesKeyOnlyIfNeeded = true // REPLACES THE BELOW
  }

  /* REPLACED BY ABOVE
  override var becomesKeyOnlyIfNeeded: SwiftBool {
    get {
        return true
    }
    set {

    }
  }
  */
}

class AppDelegate: NSObject, NSApplicationDelegate {
    var window: InspectorPanel!

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApplication.shared.setActivationPolicy(.accessory)
        guard let screenSize = NSScreen.main?.frame.size else { return }


        // Calculate top right corner position
        let windowX = screenSize.width - 200 - 10
        let windowY = 0.0


        // Create the window with desired dimensions and style
        window = InspectorPanel(
            contentRect:  NSMakeRect(windowX, windowY, 200, 100),
            styleMask: [
                // .titled, 
                // .resizable,
                // .closable, 
                .fullSizeContentView,
                .nonactivatingPanel,
            ],
            backing: .buffered,
            defer: false)

        // Hide the title bar
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.standardWindowButton(.closeButton)?.isHidden = true
        window.standardWindowButton(.miniaturizeButton)?.isHidden = true
        window.standardWindowButton(.zoomButton)?.isHidden = true

        // Set the window to float above all other windows
        window.level = .floating

        // Set the ContentView as the content view of the window
        // window.contentView = NSHostingView(rootView: ContentView())
        window.contentView = DraggableHostingView(rootView: ContentView())

        // Display the window
        window.makeKeyAndOrderFront(nil)
        window.orderFrontRegardless()
        window.isOpaque = false
        window.backgroundColor = .clear
    }
}
