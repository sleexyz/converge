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

          # From https://github.com/loophp/rust-shell
          rustInfo =
            with pkgs;
            let
              rust = rust-bin.stable.latest.default.override {
                extensions = [ "rust-src" ];
                # From https://gist.github.com/oxalica/310d9a1ba69fd10123f2d70dc6e00f0b
                # targets = [ "wasm32-unknown-unknown" ];
              };
            in
            {
              # From https://discourse.nixos.org/t/rust-src-not-found-and-other-misadventures-of-developing-rust-on-nixos/11570/11
              path = "${rust}/lib/rustlib/src/rust/library";
              drvs = [
                rust-analyzer
                rust
              ];
            };
        in
        with pkgs; {
          devShell = mkShell {
            name = "devEnvironment";
            RUST_SRC_PATH = "${rustInfo.path}";
            nativeBuildInputs = [
              cowsay
              # Tauri deps
              bun
              rustInfo.drvs
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
