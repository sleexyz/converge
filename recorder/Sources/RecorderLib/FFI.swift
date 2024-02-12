import SwiftRs

@_cdecl("start")
public func start() {
    // print("Starting the app")
    // return AppDelegate.start()
    Task { @MainActor in
        ScreenRecorder.shared.isAppExcluded = true
        if await ScreenRecorder.shared.canRecord {
            await ScreenRecorder.shared.start()
        } 
    }
}

@MainActor
@_cdecl("get_last_frame")
public func getLastFrame() -> SRData? {
    return ScreenRecorder.shared.lastFrame
}