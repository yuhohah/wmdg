# Esfera com anéis independentes

Arte preparada no PixelLab; movimento composto no jogo a 30 FPS.
As quatro pontas externas foram removidas preservando o aro gravado e
os medalhões. O globo central permanece parado.

- `outer.png`: aro externo, horário, uma volta a cada 24 segundos.
- `ring-1.png`: anel marfim, anti-horário, 12 segundos.
- `ring-2.png`: anel cinza, anti-horário, 16 segundos.
- `ring-3.png`: anel cinza, anti-horário, 20 segundos.
- `globe.png`: globo central fixo.
- `still.png`: composição estática usada na tela inicial e durante carregamento.
- `animation.json`: períodos, fases, pivôs e origem dos arquivos.
- `preview.html`: prévia animada das mesmas camadas.

As camadas são PNGs transparentes de 256 × 256. O canvas do jogo tem
384 × 384, com centro em [192, 192]. Cada anel usa seu próprio pivô,
ângulo e relógio; as metades traseiras e dianteiras são desenhadas em
passagens separadas ao redor do globo. Os anéis cinza compartilham o
desenho base e têm fases e velocidades independentes.

Esta composição substitui a folha antiga em `../girar/` durante o jogo.
Clique e ganho de Fé continuam em `SphereController.ts`; a rotação está
em `SphereSprite.ts`. Pausa fora da tela e respeita movimento reduzido.
