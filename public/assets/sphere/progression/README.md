# Formas da Esfera no jogo

A animação usa o relógio visual compartilhado, limitado a 30 FPS; a rotação avança pelo tempo decorrido, preservando sua velocidade em telas de 60 Hz ou 120 Hz.

O jogo usa os núcleos PNG abaixo e desenha os aros vetoriais em Canvas 2D, com ordenação por profundidade. `SphereMotion.ts` controla as rotações independentes, e `SphereVisual.ts` cuida da renderização e suspensão fora da tela, com a aba oculta ou movimento reduzido.

| Progresso | Núcleo | Aros |
| --- | --- | --- |
| Selo fechado | `nucleo.png` (imagem inicial aprovada) | 0 |
| Encarnação liberada | `engraved-globe.png` | 1 |
| Segunda forma | `engraved-globe.png`, com meridianos sutis sobrepostos | 2 |
| Órbitas | `meridian-globe.png`, sólida | 4 |
| Eclipse e Solar | `hollow-globe.png`, vazada | 4, sem auréolas pequenas |

Fontes copiadas sem alterações:

- `engraved-globe.png`: `concepts/esfera-pixellab-v1/01-nucleo.png`.
- `meridian-globe.png`: `concepts/esferas-sem-aros-v1/02-esfera-meridianos.png`.
- `hollow-globe.png`: `sprites/esfera/layers/globe.png`.

As geometrias seguem as prévias de Meridiano, Equador, Órbitas e `esferas-sem-aros-v1/meridianos-animados`. Todos os aros usam a cor `#dedccd` e espessura total de 7 unidades na área de 512 × 512. O aro externo completa seu giro vertical.

A rotação inicial é horária. Em cada clique real do jogador, cada aro ativo recebe um multiplicador independente de velocidade entre 0,6 e 1,8; seu sentido original é preservado. A esfera sorteia o sentido horário ou anti-horário com a mesma probabilidade. As velocidades se aproximam gradualmente dos novos valores, preservando a posição angular. Esse estado visual não é gravado no save nem altera recompensas.

Os antigos SVG/APNG e suas imagens estáticas permanecem como arquivos históricos; não controlam mais a animação do jogo.
A forma acompanha o estado atual: restauração/importação do save, desbloqueio, evolução e Ascensão. Não cria estado adicional no save nem modifica custos, bônus ou requisitos da Encarnação.

Parte das fontes citadas acima foi removida da main e pode ser consultada no histórico do Git; os conceitos com alterações locais foram preservados ao reaplicar o stash.
