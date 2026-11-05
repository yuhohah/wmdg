# Órbitas — PixelLab V2

Nova geração no MCP PixelLab, modelo PixMiniMax, com 40 quadros solicitados e referência final igual à inicial. Base: a arte original `../../04-orbitas.png`, reduzida para 256 × 256 pelo limite do modelo.

O prompt especifica cada aro girando em seu próprio plano: diagonal inclinado, meridiano polar vertical e equador horizontal. Solicita gravura detalhada, marcas acompanhando os aros, esfera e moldura fixas, velocidade constante e continuidade na passagem do último quadro ao primeiro.

- `animation.apng`: animação com cores integrais dos PNGs, sem redução de paleta.
- `animation.gif`: versão compatível com reprodução infinita.
- `preview.html`: página independente com pausa, velocidade e seleção de quadro.
- `frames/`: todos os quadros originais do PixelLab.
- `manifest.json`: prompt, seed, custo, IDs e dados da exportação.

Reprodução a 10 quadros por segundo. Um quadro final exatamente igual ao primeiro, quando presente, é omitido apenas na reprodução para evitar permanência duplicada na junção; todos os quadros baixados são preservados em `frames/`.

O movimento foi sintetizado pelo PixelLab. Os planos e a velocidade são instruções ao modelo; a sequência precisa ser avaliada visualmente e não oferece garantia de geometria ou mecânica exatas. A geração não foi integrada ao jogo.
