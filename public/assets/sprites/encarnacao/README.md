# Caminhada da Encarnação

Cinco estágios gerados no PixelLab a partir dos conceitos aprovados (revisão 2).
Cada pasta contém `andar/00.png` (referência), oito quadros `01.png` a `08.png`,
`spritesheet.png` horizontal de 1024 × 128 e `animation.json` com metadados.
O ciclo usa apenas os oito quadros gerados, com 120 ms por quadro.

Estas caminhadas frontais são estudos e não estão ativas no jogo.
O altar usa apenas a pose estática aprovada de cada estágio.
A caminhada futura será de perfil, liderando a procissão rumo ao boss;
essas sequências de batalha serão necessárias novas artes direcionais.
Não há auréola nos estágios 1–2; ela aparece no 3; o círculo posterior aparece no 4–5.
A aparência não altera custos, produção ou bênçãos.

Integração: `src/features/incarnation/incarnationSprites.ts` e `src/features/incarnation/IncarnationAltar.ts`.

No estágio Solar, os quadros finais foram selecionados para preservar o círculo.
A correspondência com a geração original consta em `sheet_source_indices`.
