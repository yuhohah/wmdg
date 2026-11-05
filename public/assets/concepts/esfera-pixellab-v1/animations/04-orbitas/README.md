# Órbitas — aros rígidos com profundidade

Abra `preview.html` no navegador. O HTML é independente: inclui o código e a gravura do PixelLab, sem rede ou bibliotecas externas. Requer WebGL. Resolução de 512 × 512, fundo preto. Inclui pausa, velocidade, reinício e seleção manual do instante.

O globo permanece fixo, com a mesma base usada nas animações anteriores e uma grade hermética. Os aros meridiano, equatorial e oblíquo são faixas circulares rígidas e concêntricas, com largura, espessura e chanfros. A moldura externa permanece fixa, seguindo o conceito Órbitas. As superfícies usam cores chapadas, contornos e hachuras em osso/prata.

Os aros têm raios distintos e folgas suficientes para não se atravessarem em qualquer orientação. A composição usa teste de profundidade por fragmento, inclusive entre os aros; não depende de uma ordem fixa de camadas. Projeção ortográfica, velocidade angular constante, sem deformação da geometria. Trata-se de movimento cinemático prescrito, sem simulação de forças.

Períodos: meridiano +12 s, equador −16 s, oblíquo +24 s. O conjunto retorna ao início em 48 s. O raio da moldura também preserva a folga das faixas móveis. As medidas estão em `manifest.json`.

`renderer.js` é a fonte editável. Execute `python3 build.py` para reconstruir o HTML independente. A API de inspeção `window.orbitDemo` permite selecionar um instante e conferir a independência da ordem de desenho com `verify()`.

A composição usa um renderizador com profundidade em HTML em vez de camadas SVG. Não foi integrada à esfera em execução no jogo.
