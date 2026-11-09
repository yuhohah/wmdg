# Meridiano — aro em rotação

Abra `preview.html` para visualizar, pausar e alterar a velocidade. `rotation.svg` é uma animação autônoma de 512 × 512 com a imagem incorporada. Aros: ciclo de 8 segundos; núcleo e conjunto: ciclo de 24 segundos.

O globo é a arte Núcleo original do PixelLab, girando no sentido horário com período de 24 s. O aro foi reconstruído como geometria vetorial lisa em osso. Ele gira 360° em torno do eixo vertical, mantendo a inclinação de 10°, com partes posteriores ocultadas pela esfera. O giro do núcleo é independente do aro.

A geometria é projetada em 60 intervalos por volta e interpolada continuamente por SVG/SMIL. Fundo preto opaco. Animação sem integração ao jogo.

Estilo padronizado em `public/assets/concepts/ring-style.json`: todos os aros têm espessura de 7 px na tela-base de 512 px e superfície lisa em osso `#dedccd`.

Rotação do núcleo: 360° no sentido horário a cada 24 s, no plano da imagem. Pausa e velocidade controlam o núcleo e os aros. Os aros de Meridiano e Equador conservam seus ciclos de 8 s; o conjunto se fecha em 24 s. Órbitas conserva o ciclo conjunto de 48 s.
