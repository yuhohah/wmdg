# Aros vetoriais de Órbitas

Estudo vetorial da quarta forma, com quatro aros editáveis em SVG.

- `aro-externo.svg`, `aro-meridiano.svg`, `aro-equador.svg`, `aro-diagonal.svg`: aros separados, sem fundo e sem imagem raster.
- `aros.svg`: os quatro aros juntos, estáticos, sem esfera.
- `aros-animados.svg`: os quatro aros em movimento, sem esfera e sem imagem raster.
- `orbitas-animada.svg`: prévia composta, com o núcleo original incorporado como PNG; os quatro aros são vetores.
- `orbitas-estatica.svg`: composição estática.
- `pose-0.svg` a `pose-3.svg`: amostras do giro do aro externo.

O aro externo gira em torno do eixo horizontal, passando verticalmente à frente e atrás da esfera. Os outros três aros mantêm seus planos, com marcas que circulam em sentidos independentes. Os raios são constantes e diferentes para que os aros não se atravessem. Os segmentos são ordenados por profundidade; na composição, o núcleo oculta os segmentos traseiros.

O ciclo dura 8 segundos, com 120 poses vetoriais. Todos os movimentos completam um número inteiro de voltas nesse intervalo; a pose final não é repetida. Não há JavaScript nos SVGs. `build.py` recria os arquivos com a biblioteca padrão do Python.

Esta versão é um estudo separado. A animação Órbitas V2 usada no jogo permanece disponível e não foi substituída.
