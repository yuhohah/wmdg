{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs
    google-chrome
  ];

  shellHook = ''
    echo "🎮 Idle Game Development Environment (Node.js $(node -v), npm $(npm -v))"
  '';
  allowUnfree = true;
}
# nix-shell --run "npm run build"
