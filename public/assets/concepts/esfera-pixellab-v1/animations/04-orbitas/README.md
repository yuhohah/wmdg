# Órbitas — aros rígidos com profundidade

Abra `preview.html` no navegador. O HTML é independente: inclui o código e a gravura do PixelLab, sem rede ou bibliotecas externas. Requer WebGL. Resolução de 512 × 512, fundo preto. Inclui pausa, velocidade, reinício e seleção manual do instante.

O globo gira no sentido horário, com período de 24 s, e usa a esfera sólida `public/assets/concepts/esferas-sem-aros-v1/02-esfera-meridianos.png`, que antes aparecia na última prévia. A imagem conserva seus próprios meridianos e paralelos, sem sobrepor uma segunda grade. Ela é ajustada ao mesmo raio de 130 px. Os quatro aros são faixas circulares rígidas e concêntricas, com largura, espessura e chanfros. O aro externo maior completa um giro vertical de 360° em 24 segundos, em torno do eixo horizontal: fica de perfil nos instantes 6 e 18 segundos e retorna à orientação inicial aos 24 segundos. Os outros três aros mantêm seus movimentos. As superfícies dos aros são lisas, com cor de osso uniforme, sem hachuras, divisões ou linhas centrais.

Os aros têm raios distintos e folgas suficientes para não se atravessarem em qualquer orientação. A composição usa teste de profundidade por fragmento, inclusive entre os aros; não depende de uma ordem fixa de camadas. Projeção ortográfica, velocidade angular constante, sem deformação da geometria. Trata-se de movimento cinemático prescrito, sem simulação de forças.

Períodos: meridiano +12 s, equador −16 s, oblíquo +24 s, externo +24 s no eixo horizontal. O conjunto retorna ao início em 48 s, sem pausa nem inversão na emenda. O raio externo preserva a folga das demais faixas móveis. As medidas estão em `manifest.json`.

`renderer.js` é a fonte editável. Execute `python3 build.py` para reconstruir o HTML independente. A API de inspeção `window.orbitDemo` permite selecionar um instante e conferir a independência da ordem de desenho com `verify()`.

A composição usa um renderizador com profundidade em HTML em vez de camadas SVG. Não foi integrada à esfera em execução no jogo.

Estilo padronizado em `public/assets/concepts/ring-style.json`: todos os aros têm espessura de 7 px na tela-base de 512 px e superfície lisa em osso `#dedccd`.

Rotação do núcleo: 360° no sentido horário a cada 24 s, no plano da imagem. Pausa e velocidade controlam o núcleo e os aros. Os aros de Meridiano e Equador conservam seus ciclos de 8 s; o conjunto se fecha em 24 s. Órbitas conserva o ciclo conjunto de 48 s.
