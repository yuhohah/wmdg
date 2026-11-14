# O Demiurgo — Yaldabaoth

Sprites derivados do conceito 2 via PixelLab MCP. Perfil lateral voltado à direita, PNG RGBA de 256 × 192 px, no padrão dos outros bosses.

- `idle.png`: pose base.
- `andar/`: ciclo de locomoção serpentina.
- `ataque-esfera/`: antecipação, arremesso e recuperação.
- `ataque-ritual/`: cajado erguido e luz mística; sol e lua não fazem parte do sprite.
- `ataque-ritual-sem-luz/`: gesto ritual com cajado erguido, sem luz ou efeitos mágicos.
- `derrota/`: queda sem retorno à pose inicial.

Cada pasta contém `00.png` a `16.png`, `spritesheet.png` horizontal (4352 × 192), `animation.json` e `preview.gif`. O quadro 00 é a pose inicial; os demais são os 16 quadros gerados. Use `animation.json` para temporização e repetição. Ataques e derrota não repetem no jogo; GIFs são apenas prévias.

Abra `preview.html` para reproduzir as cinco animações. Metadados e IDs de geração em `manifest.json`. Assets preparados para integração; este pacote não altera o combate nem cadastra o boss no jogo.
