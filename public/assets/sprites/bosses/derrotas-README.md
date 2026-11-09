# Derrota dos Guardiões

Animações criadas em 09/11/2026 no **PixelLab PixMiniMax**, usando o `idle.png` de cada chefe como primeiro quadro. A prévia está em `derrotas-preview.html`. Os prompts completos e identificadores de geração estão em `derrotas-manifest.json`; cada pasta `derrota/` contém metadados e a spritesheet pronta para o jogo.

- Anúbis: perde o equilíbrio, larga a balança e cai.
- Hades (`boss_cronos` no save): desaba com a armadura.
- Odin: cai com a lança enquanto o corvo se afasta.
- Caos Primordial (`boss_tiamat` no save): os tentáculos e o aro se contraem até o núcleo desaparecer.

Cada spritesheet tem 17 quadros de 256 × 192, incluindo o sprite original inalterado, em uma faixa horizontal RGBA de 4352 × 192. São quatro PNGs, 680.492 bytes ao todo. As folhas são carregadas com os outros sprites apenas quando o respectivo chefe é acessado.

`BossBattleModal` toca a folha uma única vez ao vencer o chefe, durante os 1,5 segundos já reservados ao clímax. A reprodução segue o tempo decorrido, no loop visual de 30 FPS. O desenho mantém sua escala e base no cenário; o último décimo da sequência desaparece gradualmente. Os feixes iniciais se apagam cedo para não encobrir a queda. Só depois começa o retorno dos Fiéis e da Encarnação e aparece o resultado. Recompensas e progresso continuam sob responsabilidade de `GameStateManager`.

Se a folha não estiver disponível, o desaparecimento anterior funciona como alternativa. Perder a batalha não toca a morte do chefe. A ordenação de quadros e as transições foram testadas para os quatro chefes, incluindo a preservação do retorno e da derrota do jogador. Os PNGs de execução estão incluídos pelo filtro de publicação; a prévia, este README e os metadados não são necessários em produção.
