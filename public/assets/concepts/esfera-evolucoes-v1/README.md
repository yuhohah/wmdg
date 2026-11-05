# Evoluções da Esfera — estudo visual v1

Conceitos criados com **PixelLab Pro**, usando as duas referências fornecidas pelo usuário e a paleta da Esfera atual. Quatro estágios no total, da esfera simples ao instrumento armilar. São propostas de direção visual; o jogo continua usando seus assets atuais.

Abra [a galeria interativa](preview.html) para comparar as formas em fundo noturno ou pergaminho. Os PNGs: [Centelha](01-centelha.png), [Despertar](02-despertar.png), [Convergência](03-convergencia.png) e [Plenitude Armilar](04-plenitude-armilar.png). Prompts, seed e jobs estão em [manifest.json](manifest.json).

## Progressão proposta

| Estágio | Forma | Mudança que comunica evolução |
| --- | --- | --- |
| 1 · Centelha | Globo nu, claro, com hachuras curvas na borda. | A identidade nasce da silhueta e da matéria, sem ornamento. |
| 2 · Despertar | Primeiro anel equatorial e discretos meridianos. | A esfera começa a ordenar o espaço ao redor. |
| 3 · Convergência | Órbitas em planos cruzados e grade mais legível. | Movimento independente, profundidade e domínio de mais eixos. |
| 4 · Plenitude Armilar | Grade, arcos meridianos, equador e polos. | Aproximação da gravura armilar da referência final. |

## Ajustes recomendados antes da integração

- Manter o mesmo núcleo e a mesma luz superior esquerda em toda a sequência; evolução por estrutura, sem trocar a identidade da divindade.
- Trabalhar com marfim e prata sobre fundo escuro; ouro envelhecido apenas em pontos cardeais e junções. Preservar contraste a 128 px e verificar a leitura a 64 px.
- Deixar vãos entre os anéis e preservar trechos traseiros ocultos pelo globo. Evitar encher as órbitas de glifos, espinhos e partículas.
- Usar o equador e os eixos para distinguir as fases, sem depender apenas de aumentar o brilho ou o tamanho.
- Associar as quatro formas a marcos permanentes é uma possibilidade de design; não foi criada uma regra de desbloqueio neste estudo.

## Rotação recomendada

A esfera atual já anima os anéis independentemente, mas mantém o globo fixo (`src/features/sphere/SphereSprite.ts`). Para a nova direção, a rotação do globo deve deslocar os meridianos sobre a superfície, mantendo a iluminação fixa. Girar toda a imagem como um disco faria as sombras e os polos girarem junto e enfraqueceria o efeito de volume.

Proposta de movimento: globo em 24 s por volta; equador em 16 s; meridiano em sentido contrário em 20 s; aro externo em 32 s. São parâmetros artísticos sugeridos, não regras já aplicadas. A esfera nua exige pequenas variações de superfície para sua rotação ser perceptível; a partir do segundo estágio a grade comunica esse movimento.

Para produção, separar globo, arcos traseiros, arcos dianteiros, aro/polos e brilho. Compor a 30 FPS, manter o centro imóvel, reservar margem para os aros e respeitar movimento reduzido. O loop deve fechar sem salto de posição, escala ou iluminação. Uma animação gerada serve de estudo; anéis rígidos precisam manter a geometria consistente quadro a quadro.

## Revisão da animação

O primeiro teste PixMiniMax gerou 32 quadros mais a pose inicial. O movimento sugeriu a rotação, mas inventou continentes no globo e alterou a forma dos anéis. Essa tentativa não está aprovada como sprite de produção. A segunda tentativa, com 16 quadros gerados mais a pose inicial, eliminou os continentes e restringiu a superfície à grade abstrata. Ainda varia a forma dos anéis e a proporção do globo; deve servir como estudo de movimento, não como animação final pronta para integrar. Ela está na galeria interativa, com pausa, velocidade e seleção de quadro. Os jobs de ambas as tentativas ficam registrados no manifesto.
