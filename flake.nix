{
  inputs = { 
    flake-utils.url = "github:numtide/flake-utils"; 
    rust-overlay.url = "github:oxalica/rust-overlay";
  };
  outputs = { self, nixpkgs, rust-overlay, flake-utils }:
    flake-utils.lib.eachDefaultSystem
      (system:
        let
          pkgs = import nixpkgs { 
            inherit system; overlays = [ 
              (import rust-overlay)
            ]; 
          };

          rustToolchain = pkgs.rust-bin.fromRustupToolchainFile ./toolchain.toml;
        in
        with pkgs; {
          devShell = mkShell {
            name = "devEnvironment";
            RUST_SRC_PATH = "${rustToolchain}/lib/rustlib/src/rust/library";

            nativeBuildInputs = [
              cowsay
              # Tauri deps
              bun
              rustToolchain
              rust-analyzer-unwrapped
              # rustInfo.drvs
              libiconv
              (pkgs.darwin.apple_sdk.frameworks.Carbon)
              (pkgs.darwin.apple_sdk.frameworks.WebKit)
            ];
            shellHook = ''
              # Load non-sensitive environment variables:
              export CARGO_HOME=$PWD/.cargo
              export PATH=$PWD/.cargo/bin:$PATH
              cowsay "Successfully set up development environment!"
            '';
          };
        }
      );
}
