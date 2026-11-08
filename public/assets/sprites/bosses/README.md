# Animações dos bosses

## Versão atual: lateral

A revisão em `lateral/` substitui as animações frontais abaixo. São quatro movimentos laterais e oito ataques distintos: bastão e balança de Anúbis, combo e correntes de Hades, lança e corvo de Odin, esferas e círculos do Caos Primordial. Consulte `lateral/README.md`, `lateral/manifest.json` e `lateral/preview.html`.


## Versão frontal anterior

Anúbis, Hades (conceito v2), Odin e Caos Primordial, gerados no PixelLab a partir dos conceitos aprovados. Artes preparadas para integração futura; não alteram a batalha no jogo.

Cada pasta de boss contém `andar/` e `atacar/`, com frames PNG transparentes de 192 × 192, spritesheet horizontal e `animation.json`. O frame inicial é o conceito original. Todos os frames fornecidos pelo gerador são preservados; um fechamento idêntico pode ser omitido da spritesheet de caminhada para evitar pausa na repetição.

- Reprodução sugerida: 120 ms por frame.
- Andar: ciclo frontal no lugar; o jogo poderá mover o personagem independentemente.
- Caos Primordial: deslocamento por levitação.
- Atacar: ação única com recuperação; a prévia repete os ataques apenas para inspeção.
- `preview.html`: prévia com pausa e controle de velocidade.
- `manifest.json`: fontes, prompts, IDs de geração e dimensões.

As pastas da versão frontal saíram do repositório e continuam disponíveis no histórico do Git; `manifest.json` e `preview.html` desta pasta ainda se referem a elas.
