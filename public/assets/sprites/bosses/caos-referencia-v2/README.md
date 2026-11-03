# Caos Primordial — referência do usuário

Substitui a versão lateral com ponta comprida. Usa a imagem enviada pelo usuário: núcleo vazio circular, órbita horizontal dourada, tentáculos e fragmentos suspensos. A referência original de 192 × 192 foi preservada e recebeu apenas espaço transparente à direita, totalizando 256 × 192, para acomodar os ataques.

- `andar/`: levitação, oscilação dos tentáculos e deslocamento no lugar; pode ser movido horizontalmente pelo jogo.
- `ataque-esferas/`: lançamento de esferas sólidas para a direita.
- `ataque-circulos/`: lançamento de círculos ocos para a direita.

Cada ação contém frames PNG transparentes, spritesheet horizontal e `animation.json`, com reprodução sugerida de 90 ms por frame. São 16 frames gerados além da pose de referência; todos são preservados. Ataques são ações únicas, repetidas apenas para comparação na prévia. As animações foram geradas no PixelLab PixMiniMax.

`idle.png` preserva a pose de referência. `manifest.json` registra os prompts e IDs de geração. `preview.html` permite pausar, ajustar a velocidade e inspecionar frames. O conjunto atual também é copiado para `../lateral/04-caos-primordial/`, sem alterar as sprites dos outros três bosses.

Integrado à batalha do Caos Primordial: o jogo carrega diretamente esta pasta, usa a levitação na chegada e entre ataques, e alterna esferas e círculos com 90 ms por frame. A área clicável permanece no corpo do boss durante os ataques, excluindo os projéteis.
