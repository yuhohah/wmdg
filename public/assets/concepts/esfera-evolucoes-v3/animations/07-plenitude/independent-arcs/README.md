# Plenitude — arcos independentes

- [Prévia interativa](preview.html): pausa, restauração, fundo, comparação com a arte original e controle individual de cada arco.
- [Animação SVG independente](animation.svg): imagens embutidas, fundo transparente, reprodução contínua sem dependências externas.
- [Manifesto](manifest.json): referências, trabalhos do PixelLab, reposicionamento e parâmetros de movimento.

| Camada | Sentido visto de frente | Tempo por volta |
| --- | --- | --- |
| Arco dourado | Horário | 18 s |
| Equador prateado | Anti-horário | 12 s |
| Meridiano prateado | Horário | 30 s |
| Globo e moldura | Fixos | — |

As camadas PNG de 256 × 256 foram separadas e reconstruídas com PixelLab. O dourado usa uma máscara vetorial e uma base elíptica para excluir um aro adicional da extração e manter seu contorno contínuo. O dourado e o meridiano são reposicionados para compartilhar o pivô (128, 128). Cada arco é composto em duas metades: traseira antes do globo e dianteira depois dele; a moldura fica por cima. A divisão acompanha o eixo maior de cada elipse, evitando cortes aparentes sobre o globo.

A animação gira as camadas no plano da imagem. A separação reconstrói partes ocultas e modifica alguns detalhes em relação à arte original; não é uma malha 3D. Os PNGs são preservados durante a reprodução, sem geração de novos quadros. Os três movimentos retornam juntos à posição inicial após 180 segundos.

Para regenerar o SVG e a prévia depois de ajustar as camadas ou o movimento:

```sh
python3 build.py
```

Os controles da prévia preservam a posição do arco ao mudar sua velocidade ou sentido. A opção de movimento reduzido do sistema inicia a prévia pausada. Esta versão ainda não foi integrada ao jogo.
