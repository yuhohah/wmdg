# Meridianos — esfera giratória e aros vetoriais

Abra `preview.html`. A esfera é o PNG original `public/assets/sprites/esfera/layers/globe.png`, incorporado sem retoques. Sua estrutura vazada é centralizada e ajustada ao mesmo raio de 130 px usado nas outras prévias. Os quatro aros são caminhos SVG calculados em coordenadas espaciais e ordenados por profundidade em cada quadro.

- A imagem da esfera faz uma volta no plano da tela em 24 segundos, começando no sentido horário.
- **Inverter esfera** troca o sentido sem alterar a posição angular e sem inverter os aros.
- Meridiano: 12 s; equador: 16 s em sentido contrário; oblíquo: 24 s; aro externo: giro vertical completo de 24 s.
- **Pausar**, **Velocidade**, **Reiniciar** e **Baixar aros SVG** permitem inspecionar a animação e exportar somente os vetores na pose atual.
- O ciclo original completo se fecha em 48 segundos. Movimento reduzido inicia a prévia pausada.

`renderer.js` contém a geometria e os controles editáveis. `python3 build.py` recompõe o HTML independente. A API de inspeção `window.meridianDemo` permite pausar e avançar tempos exatos.

O giro da esfera é uma rotação da imagem no plano da tela, não uma reconstrução de sua face traseira. A esfera continua raster; os aros são vetoriais. Este estudo não substitui automaticamente os assets usados pelo jogo.

Aros padronizados: todos os quatro aros têm espessura de 7 px e superfície lisa em `#dedccd`, sem divisões, hachuras ou traços centrais. Configuração comum: `public/assets/concepts/ring-style.json`.
