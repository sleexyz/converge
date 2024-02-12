use swift_rs::SwiftLinker;

fn build() {
    // swift-rs has a minimum of macOS 10.13
    // Ensure the same minimum supported macOS version is specified as in your `Package.swift` file.
    SwiftLinker::new("14.2")
        .with_package("RecorderLib", "../../recorder")
        .link();

    // Other build steps
}

fn main() {
    tauri_build::build();
    build();
}
