//
//  clippyApp.swift
//  clippy
//
//  Created by Sean Lee on 12/7/23.
//

import AppKit
import SwiftData
import SwiftUI

class DraggableHostingView<Content>: NSHostingView<Content> where Content: View {
    override var mouseDownCanMoveWindow: Bool {
        return NSEvent.modifierFlags.contains(.command)
    }
}

class InspectorPanel: NSPanel {
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

    var statusBarItem: NSStatusItem?

    @objc func option1() {
        // Handle the action for the first menu item
    }

    @objc func quit() {
        NSApplication.shared.terminate(self)
    }

    func applicationDidFinishLaunching(_: Notification) {
        statusBarItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)

        // Set the icon
        if let button = statusBarItem?.button {
            button.image = NSImage(named: NSImage.infoName)
        }

        // Create the menu
        let menu = NSMenu()
        menu.addItem(NSMenuItem(title: "Option 1", action: #selector(option1), keyEquivalent: ""))
        menu.addItem(NSMenuItem(title: "Quit", action: #selector(quit), keyEquivalent: "q"))

        statusBarItem?.menu = menu

        NSApplication.shared.setActivationPolicy(.accessory)
        guard let screenSize = NSScreen.main?.frame.size else { return }

        // Calculate top right corner position
        let windowX = screenSize.width - 400 - 10
        let windowY = 0.0 + 10

        // Create the window with desired dimensions and style
        window = InspectorPanel(
            contentRect: NSMakeRect(windowX, windowY, 400, 200),
            styleMask: [
//                 .titled,
                // .resizable,
                // .closable,
                .fullSizeContentView,
                .nonactivatingPanel,
            ],
            backing: .buffered,
            defer: false
        )

        // Hide the title bar
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.standardWindowButton(.closeButton)?.isHidden = true
        window.standardWindowButton(.miniaturizeButton)?.isHidden = true
        window.standardWindowButton(.zoomButton)?.isHidden = true

        // Set the window to float above all other windows
        window.level = .floating
        window.ignoresMouseEvents = true
        window.acceptsMouseMovedEvents = true
        
        let hostingView = DraggableHostingView(rootView: ContentView(window: window))
        window.contentView = hostingView

        window.isOpaque = false
        window.backgroundColor = .clear

        // Display the window
        window.orderFrontRegardless()
    }
}

let appDelegate = AppDelegate()
let application = NSApplication.shared
application.delegate = appDelegate

_ = NSApplicationMain(CommandLine.argc, CommandLine.unsafeArgv)
