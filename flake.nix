{
  inputs = { flake-utils.url = "github:numtide/flake-utils"; };
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem
      (system:
        let
          pkgs = import nixpkgs { inherit system; overlays = [ ]; };
        in
        with pkgs; {
          devShell = mkShell {
            name = "devEnvironment";
            buildInputs = [
              bun
              entr
              rustc
              cargo
              libiconv
              cowsay
              (pkgs.darwin.apple_sdk.frameworks.Carbon)
              (pkgs.darwin.apple_sdk.frameworks.WebKit)
            ];
            shellHook = ''
              # Load non-sensitive environment variables:
              cowsay "Successfully set up development environment!"
              export CARGO_HOME=$PWD/.cargo
              export PATH=$PWD/.cargo/bin:$PATH
            '';
          };
        }
      );
}
