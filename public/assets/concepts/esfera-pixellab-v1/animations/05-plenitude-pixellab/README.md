# Plenitude Armilar — animação PixelLab

Gerada diretamente da arte original `../../05-plenitude-armilar.png` pelo MCP PixelLab. A versão escolhida usa `animate_image`, após duas tentativas no PixMiniMax que acrescentaram continentes ao núcleo. As tentativas rejeitadas estão em `../05-plenitude-pixellab-attempt1/` e `../05-plenitude-pixellab-attempt2/`.

A entrada é a arte original reduzida para 256 × 256, limite do modelo. O prompt solicita giros independentes e alternados dos aros meridiano, equatorial, de latitude e polares, núcleo estático e fechamento contínuo do ciclo.

## Arquivos

- `animation.apng`: animação com cores integrais dos quadros, sem redução de paleta.
- `animation.gif`: reprodução infinita em formato compatível.
- `preview.html`: página independente com pausa, velocidade e seleção de quadro.
- `frames/`: nove PNGs originais do PixelLab, incluindo a entrada.
- `manifest.json`: prompt completo, seed, IDs, custo e dados de continuidade.

Oito quadros foram gerados pelo modelo escolhido. Dois quadros finais redundantes foram omitidos apenas na reprodução; os nove PNGs brutos permanecem em `frames/`. A seleção final contém sete quadros, com 120 ms por quadro e ciclo infinito de 840 ms. O critério de redundância compara a diferença RGB para o primeiro quadro com metade da transição mediana da sequência.

## Avaliação

O modelo escolhido preservou melhor o núcleo e o fundo. O movimento do meridiano é mais evidente; os giros dos anéis menores são discretos, e ainda há pequenas variações nos contornos. A independência cinemática e a velocidade angular não são exatas, pois o movimento foi sintetizado por IA. Os dados da junção comparam imagens e não provam continuidade da velocidade.

As três tentativas consumiram 20 gerações: 6 + 6 no PixMiniMax e 8 no modelo escolhido. A animação não foi integrada ao jogo.
