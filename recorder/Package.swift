// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "recorder",
    platforms: [
        .macOS(.v14),
    ],
    products: [
        .library(
            name: "RecorderLib",
            type: .static,
            targets: ["RecorderLib"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/Brendonovich/swift-rs", from: "1.0.5"),
    ],
    targets: [
        .target(
            name: "RecorderLib",
            // Must specify swift-rs as a dependency of your target
            dependencies: [
                .product(
                    name: "SwiftRs",
                    package: "swift-rs"
                ),
            ]
        ),
        // Targets are the basic building blocks of a package, defining a module or a test suite.
        // Targets can depend on other targets in this package and products from dependencies.
        .executableTarget(
            name: "recorder",
            dependencies: [
                "RecorderLib",
            ]
        ),
    ]
)
