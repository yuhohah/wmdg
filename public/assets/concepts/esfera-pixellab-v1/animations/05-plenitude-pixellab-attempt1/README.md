# Plenitude Armilar — animação PixelLab

Gerada no MCP PixelLab, modelo PixMiniMax, diretamente da imagem original `../../05-plenitude-armilar.png`. A entrada foi reduzida para 256 × 256, limite do modelo, mantendo a arte original.

O prompt solicita giros independentes dos aros meridiano, equatorial, de latitude e polares, mantendo o núcleo, sua grade e a câmera fixos. Solicita também velocidade constante e fechamento do ciclo com posição e velocidade compatíveis.

## Arquivos

- `animation.apng`: animação com cores integrais dos quadros, sem redução de paleta.
- `animation.gif`: reprodução infinita em formato compatível.
- `preview.html`: página independente com pausa, velocidade e seleção de quadro.
- `frames/`: todos os PNGs originais do PixelLab.
- `manifest.json`: prompt, seed, custo, IDs e dados de continuidade na exportação.

Reprodução a 10 quadros por segundo. Se o último quadro for redundante em relação ao primeiro, ele é omitido apenas da reprodução para reduzir uma permanência duplicada na junção; todos os quadros baixados continuam em `frames/`. A decisão usa diferença média RGB comparada à transição mediana do restante da sequência.

O movimento é sintetizado pelo PixelLab, sem garantia de rigidez ou velocidade angular exatas. A continuidade precisa ser avaliada visualmente além da comparação entre quadros. A animação não foi integrada ao jogo.
