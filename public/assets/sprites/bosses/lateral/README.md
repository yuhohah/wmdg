# Bosses — animações laterais

Revisão dos movimentos em perfil, voltados para a direita. A batalha usa as pastas laterais dos três primeiros bosses e carrega o Caos Primordial diretamente de `../caos-referencia-v2/`.

Em 2026-11-03, o Caos Primordial foi atualizado conforme a imagem enviada pelo usuário: núcleo circular, anel horizontal e tentáculos preservados. Ele se desloca por levitação e lança os projéteis para a direita mantendo essa aparência. As sprites dos outros três bosses foram preservadas. A versão isolada está em `../caos-referencia-v2/`.

| Boss | Movimento | Ataque 1 | Ataque 2 |
| --- | --- | --- | --- |
| Anúbis | Andar | Golpe com bastão | Golpe com balança |
| Hades | Andar | Combo com os dois ganchos | Lançamento dos dois ganchos nas correntes |
| Odin | Andar | Estocada com lança | Investida do corvo |
| Caos Primordial | Levitar | Esferas de energia | Círculos de energia |

Cada ação contém frames PNG transparentes de 256 × 192, spritesheet horizontal e `animation.json`. São 16 frames gerados, além da pose inicial. Todos os frames são preservados; a spritesheet pode omitir uma pose final idêntica à inicial. Reprodução sugerida: 90 ms por frame. Caminhadas em ciclo; ataques reproduzidos uma vez, retornando à pose de repouso. Os projéteis estão incluídos nos frames dos ataques.

`idle.png` guarda a base lateral de cada boss. `profiles.json` registra as poses e `manifest.json` registra prompts, fontes e IDs das animações, geradas no PixelLab PixMiniMax.

`preview.html` permite pausar, mudar a velocidade, inspecionar frames e espelhar os movimentos para a esquerda.
