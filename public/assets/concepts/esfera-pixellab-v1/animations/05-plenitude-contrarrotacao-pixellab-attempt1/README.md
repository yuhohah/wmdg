# Plenitude Armilar — núcleo em contrarrotação

Nova animação diretamente da imagem original da esfera 5, usando o mesmo modelo da versão escolhida anteriormente: MCP PixelLab `animate_image`. Entrada de 256 × 256, oito quadros solicitados, referência final igual à inicial e seed 572113.

O prompt pede que a esfera interna gire sobre o eixo vertical com a grade e as hachuras percorrendo a face visível para a direita. O aro equatorial gira no sentido contrário, para a esquerda na frente. Os demais aros mantêm giros próprios. Câmera e fundo preto permanecem fixos; não são solicitados desenhos novos ou geografia sobre o núcleo.

## Arquivos

- `animation.apng`: animação com cores integrais, sem redução de paleta.
- `animation.gif`: versão com repetição infinita.
- `preview.html`: página independente com pausa, velocidade e seleção de quadro.
- `frames/`: todos os PNGs originais do PixelLab.
- `manifest.json`: prompt, seed, ID, custo e dados da exportação.

Reprodução com 120 ms por quadro. Quadros de chegada redundantes são omitidos apenas na reprodução para reduzir permanências duplicadas na junção; todos os originais continuam em `frames/`. O critério compara a diferença RGB para o primeiro quadro com metade da transição mediana da sequência.

A direção, independência e constância dos giros são instruções ao modelo. A sequência exige avaliação visual; a diferença entre quadros não comprova continuidade de velocidade. A animação não foi integrada ao jogo.
