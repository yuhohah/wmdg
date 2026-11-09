# Equador — aros em sentidos contrários

Abra `preview.html` para visualizar, pausar, reiniciar e alterar a velocidade. `rotation.svg` funciona sozinho, com a imagem incorporada, em 512 × 512 e fundo preto. Aros: ciclo de oito segundos; núcleo e conjunto: ciclo de 24 segundos.

Segue a técnica da animação do Meridiano: o globo original do PixelLab gira no sentido horário, com período de 24 s. Uma grade sutil e os dois aros foram reconstruídos em vetor, preservando a estética de gravura em osso/prata. O meridiano e o equador giram em torno do eixo vertical com velocidades angulares opostas (+45°/s e −45°/s). O aro equatorial mantém sua pequena inclinação inicial. As partes traseiras ficam atrás do globo; as dianteiras passam sobre ele. Os aros têm superfície lisa, sem marcas ou linhas centrais.

A animação usa 60 intervalos interpolados por volta. Não foi integrada à esfera em execução no jogo.

Estilo padronizado em `public/assets/concepts/ring-style.json`: todos os aros têm espessura de 7 px na tela-base de 512 px e superfície lisa em osso `#dedccd`.

Rotação do núcleo: 360° no sentido horário a cada 24 s, no plano da imagem. Pausa e velocidade controlam o núcleo e os aros. Os aros de Meridiano e Equador conservam seus ciclos de 8 s; o conjunto se fecha em 24 s. Órbitas conserva o ciclo conjunto de 48 s.
