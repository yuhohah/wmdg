# Órbitas — PixelLab V2

Nova geração no MCP PixelLab, modelo PixMiniMax, com 40 quadros solicitados e referência final igual à inicial. Base: a arte original `../../04-orbitas.png`, reduzida para 256 × 256 pelo limite do modelo.

O prompt especifica cada aro girando em seu próprio plano: diagonal inclinado, meridiano polar vertical e equador horizontal. Solicita gravura detalhada, marcas acompanhando os aros, esfera e moldura fixas, velocidade constante e continuidade na passagem do último quadro ao primeiro.

- `animation.apng`: animação com cores integrais dos PNGs, sem redução de paleta.
- `animation.gif`: versão compatível com reprodução infinita.
- `preview.html`: página independente com pausa, velocidade e seleção de quadro.
- `frames/`: todos os quadros originais do PixelLab.
- `manifest.json`: prompt, seed, custo, IDs e dados da exportação.

Reprodução a 10 quadros por segundo. Um quadro final redundante, quando a diferença para o primeiro é menor que metade da transição mediana entre quadros, é omitido apenas na reprodução para reduzir a permanência duplicada na junção; todos os quadros baixados são preservados em `frames/`.

O movimento foi sintetizado pelo PixelLab. Os planos e a velocidade são instruções ao modelo; a sequência precisa ser avaliada visualmente e não oferece garantia de geometria ou mecânica exatas. A geração não foi integrada ao jogo.

## Avaliação da revisão

A primeira tentativa foi preservada em `../04-orbitas-pixellab-v2-attempt1/` e rejeitada por girar o globo e acrescentar desenhos geográficos. A segunda preservou melhor a esfera original. O movimento diagonal é mais evidente; os giros vertical e horizontal em seus próprios planos permanecem sutis, com pequenas variações na gravura. As duas tentativas consumiram 12 gerações no total.

A reprodução final contém 40 quadros e dura quatro segundos. O quadro final redundante foi omitido da reprodução, preservado nos PNGs baixados. A diferença média RGB na junção foi 17,53/255; a média entre quadros é 16,45/255. Essa medida indica ausência de um salto de imagem desproporcional na junção, mas não comprova velocidade angular constante. O APNG foi conferido pixel a pixel contra os PNGs selecionados, sem alterações.
