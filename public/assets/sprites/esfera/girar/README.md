# Esfera — rotação em sentidos opostos

Animação criada no PixelLab pixelart_workbench a partir da arte aprovada.
O aro externo gira no sentido horário; o mecanismo interno, no anti-horário.
O pequeno núcleo central permanece imóvel. Cada camada gira em 2D, sem
redesenhar ou deformar a esfera.

## Arquivos

- `spritesheet.png`: PNG transparente de 3072 × 3072, grade 8 × 8.
- `00.png` a `63.png`: 64 quadros PNG transparentes de 384 × 384.
- `animation.json`: posições de recorte, ângulos, duração e validações.
- `preview.html`: visualizador com pausa, seleção de quadro e velocidade.
- `preview.gif`: prévia com fundo escuro; para o jogo, usar os PNGs.
- `source.png`: arte original de 256 × 256, sem alteração.
- `recipe.json`: receita de camadas e movimentos do PixelLab.

## Reprodução no jogo

80 ms por quadro; ciclo de 5120 ms. Ler em ordem de linhas, da esquerda
para a direita. O último quadro avança naturalmente ao primeiro, sem
adicionar uma cópia do quadro inicial. A margem de 64 px protege os raios
externos durante a rotação. O pivô da sprite final é [192, 192].

```js
const frame = Math.floor(elapsedMs / 80) % 64;
const sx = (frame % 8) * 384;
const sy = Math.floor(frame / 8) * 384;
ctx.imageSmoothingEnabled = false;
ctx.drawImage(sheet, sx, sy, 384, 384, x, y, size, size);
```

Atualizar o desenho com o relógio visual de 30 FPS existente. Manter os
efeitos de clique separados do recorte da folha, sem girar novamente a
sprite inteira. Os PNGs estão integrados ao botão da esfera em
`src/features/sphere/SphereSprite.ts` e `SphereController.ts`.
A tela inicial usa a arte conceitual estática correspondente.

## Origem e verificação

PixelLab drawing: 12adb80b-77fa-4a1e-a1de-ff2092cf0da4.
Fonte: https://api.pixellab.ai/mcp/images/4839c358-72d5-43b5-8393-cd7825d2bc7e/download

Primeiro quadro igual à fonte posicionada em [64, 64]; núcleo central
inalterado em todos os quadros; paleta da fonte preservada; sem cortes nas
bordas. Rotação externa +5,625° por quadro e interna −5,625° por quadro.
