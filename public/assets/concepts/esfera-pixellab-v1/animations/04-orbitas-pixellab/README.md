# Órbitas — animação da imagem original pelo PixelLab

Gerada com o MCP PixelLab, ferramenta `animate_image_pixminimax`, a partir da arte original `../../04-orbitas.png`. A entrada foi reduzida para 256 × 256 por ser o limite do modelo. Não utiliza a reconstrução geométrica da tentativa anterior.

O prompt pede movimentos independentes dos aros em sentidos diferentes, globo e moldura estáticos, sobreposição coerente e retorno à orientação inicial. A animação é sintetizada por IA; esses pedidos não constituem garantia de rigidez geométrica ou sobreposição física perfeita.

O manifesto registra prompt completo, seed, referência, IDs do trabalho e do ativo. A geração não foi integrada ao jogo.

## Arquivos entregues

- `animation.gif`: 25 quadros em 256 × 256, ciclo infinito, 160 ms por quadro.
- `preview.html`: reprodução independente com quadros incorporados, pausa, velocidade e seleção de quadro.
- `frames/`: os 25 PNGs originais baixados do PixelLab, sem retoque.
- `contact-sheet.png`: comparação de 12 momentos da sequência.
- `input.png`: quadro original reduzido para o limite do modelo.

A inspeção mostrou movimentos distintos dos aros com boa preservação da aparência de origem, mas também pequenas variações na hachura e na forma entre quadros. A sobreposição não é uma simulação física exata.
