# Equador — aros em sentidos contrários

Abra `preview.html` para visualizar, pausar, reiniciar e alterar a velocidade. `rotation.svg` funciona sozinho, com a imagem incorporada, em 512 × 512 e fundo preto. Ciclo contínuo de oito segundos.

Segue a técnica da animação do Meridiano: o globo original do PixelLab permanece fixo. Uma grade sutil e os dois aros foram reconstruídos em vetor, preservando a estética de gravura em osso/prata. O meridiano e o equador giram em torno do eixo vertical com velocidades angulares opostas (+45°/s e −45°/s). O aro equatorial mantém sua pequena inclinação inicial. As partes traseiras ficam atrás do globo; as dianteiras passam sobre ele. Marcas finas nos aros também percorrem sentidos opostos.

A animação usa 60 intervalos interpolados por volta. Não foi integrada à esfera em execução no jogo.
