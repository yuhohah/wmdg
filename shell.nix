{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs
  ];

  shellHook = ''
    echo "🎮 Idle Game Development Environment (Node.js $(node -v), npm $(npm -v))"
  '';
}
# nix-shell --run "npm run build"
