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

          cc = pkgs.writeShellScriptBin "cc" ''
            /usr/bin/cc $@
          '';
        in
        with pkgs; {
          devShell = mkShell {
            name = "devEnvironment";
            RUST_SRC_PATH = "${rustToolchain}/lib/rustlib/src/rust/library";

            nativeBuildInputs = [
              entr
              cowsay
              # Tauri deps
              bun
              cc
              # rustToolchain
              # rust-analyzer-unwrapped
              rustup
              lld
              llvmPackages.clang
              # rustInfo.drvs
              libiconv
            ];
            shellHook = ''
              # Load non-sensitive environment variables:
              export CARGO_HOME=$PWD/.cargo
              export PATH=$PATH:''${CARGO_HOME:-~/.cargo}/bin

              export PATH=$PATH:''${RUSTUP_HOME:-~/.rustup}/toolchains/$RUSTC_VERSION-x86_64-unknown-linux-gnu/bin/
              cowsay "Successfully set up development environment!"

              
              export CC=/usr/bin/cc
              export LD=/usr/bin/ld
            '';
            RUSTC_VERSION = pkgs.lib.readFile ./rust-toolchain;
            # https://github.com/rust-lang/rust-bindgen#environment-variables
            # LIBCLANG_PATH = pkgs.lib.makeLibraryPath [ pkgs.llvmPackages_latest.libclang.lib ];
            # # Add precompiled library to rustc search path
            # RUSTFLAGS = (builtins.map (a: ''-L ${a}/lib'') [
            #   # add libraries here (e.g. pkgs.libvmi)
            # ]);
            # # Add glibc, clang, glib and other headers to bindgen search path
            # BINDGEN_EXTRA_CLANG_ARGS =
            #   # Includes with normal include path
            #   (builtins.map (a: ''-I"${a}/include"'') [
            #     # add dev libraries here (e.g. pkgs.libvmi.dev)
            #     # pkgs.glibc.dev
            #   ])
            #   # Includes with special directory paths
            #   ++ [
            #     ''-I"${pkgs.llvmPackages_latest.libclang.lib}/lib/clang/${pkgs.llvmPackages_latest.libclang.version}/include"''
            #     # ''-I"${pkgs.glib.dev}/include/glib-2.0"''
            #     # ''-I${pkgs.glib.out}/lib/glib-2.0/include/''
            #   ];
          };
        }
      );
}
