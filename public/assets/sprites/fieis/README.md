# Animações dos Fiéis

Modelos escolhidos: Iniciado, Hierofante e Pontífice da Esfera.
Arte gerada no PixelLab a partir das sprites conceituais aprovadas.
As folhas de sprites estão integradas ao pátio em `src/features/followers/FollowersArena.ts`.
A representação visual agrupa 20 Iniciados em um Hierofante a partir de 40
fiéis, e 20 Hierofantes em um Pontífice (400 fiéis). As sobras permanecem
visíveis; o limite de 60 personagens reduz apenas a exibição dos Pontífices
em populações grandes. Quantidade real e produção não são alteradas.

Cada modelo possui pastas `andar`, `rezar` e `iluminacao`, com quadros PNG
transparentes de 96 × 96 px, folha horizontal `spritesheet.png` e metadados
em `animation.json`. Os PNGs numerados mantêm a ordem original do gerador;
`00.png` é a imagem de referência.

- `andar`: 8 quadros de ciclo, 120 ms por quadro. A folha omite a referência.
- `rezar`: 13 quadros incluindo referência; ajoelha e termina em oração.
- `iluminacao`: 9 quadros incluindo referência, partindo do fim da oração.

Reza e iluminação são sequências executadas uma vez. Para o jogo, manter
o último quadro ao concluir; o visor de comparação repete para avaliação.
A iluminação está incorporada à sprite, não é uma camada de efeito separada.
Preservar a grade de pixels e desativar interpolação ao ampliar.
