# Evolução da esfera — sete etapas

Revisão dos conceitos V2 para suavizar a evolução e reduzir o detalhe central da primeira forma. Gerada com PixelLab, usando as gravuras anteriores e a esfera atual do jogo como referências. São conceitos para avaliação visual, ainda sem integração no jogo.

| Etapa | Conceito | Acréscimo visual pretendido |
| --- | --- | --- |
| 1 | Centelha | Globo de marfim quase liso; centro discreto, sem moldura circular. |
| 2 | Primeiro Traço | Primeiras coordenadas muito sutis sobre a superfície. |
| 3 | Equilíbrio | Primeiro anel fino de prata. |
| 4 | Alinhamento | Segundo arco e primeiro acento mínimo de ouro envelhecido. |
| 5 | Convergência | Grade mais clara, gravura leve e primeiras aberturas pequenas. |
| 6 | Despertar Armilar | Mais estrutura interna visível e contorno externo fino. |
| 7 | Plenitude | Estrutura armilar completa com ornamentos contidos e painéis de marfim preservados. |

## Arquivos

- [Galeria comparativa](preview.html): sete formas, seleção ampliada e alternância de fundo.
- [Galeria animada](animated-preview.html): sete rotações, pausa, velocidade, seleção de quadro e comparação com a arte estática.
- [Plenitude com arcos independentes](animations/07-plenitude/independent-arcs/preview.html): arco dourado em 18 s, equador em sentido contrário em 12 s e meridiano em 30 s, com globo e moldura fixos. Inclui [SVG animado independente](animations/07-plenitude/independent-arcs/animation.svg) e controles individuais.
- [Manifesto de geração](manifest.json): prompts, referências, seed e identificadores dos trabalhos no PixelLab.
- [Manifesto das animações](animations/manifest.json): referências, prompts de movimento e trabalhos de geração.
- PNGs individuais: 256 × 256, fundo transparente.
- `animations/<etapa>/rotation.svg`: sete animações independentes, com PNG embutido, transparência e giro contínuo de 16 segundos. Basta abrir cada SVG no navegador. Essa rotação ocorre no plano da imagem e preserva exatamente a arte estática.

## Direção para animação

A quarta arte foi refeita a partir da terceira, com dois arcos finos e oclusão à frente e atrás do globo. A nova imagem substitui `04-alinhamento.png`; o manifesto registra a revisão e a versão rejeitada.

A galeria abre no modo **Giro contínuo**, com transformação rígida no plano da imagem, sem alterar os PNGs de origem. Esse modo preserva todos os traços e permite pausar e ajustar a velocidade. O seletor **Estudo PixelLab** mostra a sequência gerada por IA para comparação. A rotação no plano não simula uma rotação volumétrica em torno do eixo vertical; os estudos da IA também não garantem uma volta completa nem estabilidade rígida dos arcos. Para uma rotação volumétrica de produção, é necessário separar as camadas ou montar a geometria armilar.

Cada etapa possui uma sequência própria em `animations/<etapa>/`: 9 PNGs transparentes de 256 × 256, incluindo a imagem de entrada e o quadro final de fechamento. A galeria reproduz os quadros 00–07 a 350 ms por quadro (ciclo de 2,8 segundos), preservando o quadro 08 em disco. A primeira tentativa com PixMiniMax foi substituída após introduzir mapas e detalhes ausentes nas artes. Os identificadores dessas tentativas estão no manifesto; somente os quadros da nova geração são distribuídos.

As animações foram solicitadas como uma volta completa em torno do eixo vertical, com câmera fixa e iluminação constante, por PixelLab `animate_image`. Os resultados são estudos de movimento sujeitos a variações de geometria; ainda não foram integrados ao runtime.

Manter o núcleo fixo e discreto. Girar os anéis em camadas separadas e em velocidades próximas, com o mesmo pivô em todas as etapas. A textura do globo precisa de rotação própria para transmitir volume; girar somente o PNG plano produz o efeito de uma moeda. A troca entre evoluções pode usar uma transição curta de opacidade, preservando a escala e o centro.

Antes de produção, separar globo, arcos e ornamentos em camadas e conferir a leitura no tamanho real da interface. A geração independente das imagens pode variar a espessura dos traços e o enquadramento; o manifesto descreve a intenção, e os PNGs registram o resultado efetivo.

A pasta `animations/` saiu do repositório e continua disponível no histórico do Git.
