# Progressão e benchmark

O benchmark executa `GameStateManager` com políticas de interação reproduzíveis. A CLI e o painel de desenvolvimento usam o mesmo simulador; o painel roda em Web Worker. Uma simulação descreve seu perfil e suas opções, não uma duração garantida para jogadores.

## Executar

```bash
npm run benchmark -- --seed=42 --hours=24
npm run benchmark -- --seeds=1,2,3 --hours=24
npm run benchmark -- --seed=42 --hours=24 --absence=save
mkdir -p reports
node scripts/run-benchmark.mjs --seed=42 --hours=24 --json > reports/benchmark.json
```

Com Nix, envolva o comando em `nix-shell --run '...'`. O horizonte padrão é 72 horas simuladas. A saída via npm pode incluir o cabeçalho do npm; para JSON diretamente processável use `node scripts/run-benchmark.mjs --seed=42 --hours=24 --json` dentro do ambiente Node.

## Perfis

| Perfil | Política |
| --- | --- |
| Referência | Rajadas de 10 s por minuto (2 cliques/s; 2,5 cliques/s em combate; teto de 3 interações/s; atraso de decisão de 4 s), Bênção 2× recarregada até 30 s nas rajadas e após compras, 65% de captura de milagres e 90% de precisão por onda de APARAR (purifica a Maldição com 2 acúmulos). |
| Ativo intenso | Presença contínua, 2 cliques/s rotineiros (5 cliques/s em combate; atraso de decisão de 2,5 s), manutenção contínua da Bênção 2× até 60 s, 95% de captura de milagres e 97% de precisão em APARAR (purifica com 3 acúmulos). |
| Casual | 8 minutos presente a cada 20 minutos (12 minutos ausente), 1 clique/s durante a presença (2 cliques/s em combate; atraso de decisão de 5 s), Bênção 2× até 15 s após compras, 40% dos milagres e 82% de precisão em APARAR (purifica com 2 acúmulos). |
| AFK | Compras e prestígios contínuos (atraso de decisão de 12 s); cliques na Esfera e Bênção manuais param após 10 minutos, com recuperação mínima do primeiro Fiel após Gnose quando necessário. Não coleta milagres manualmente. Nos combates, usa apenas APARAR (86% de precisão, reação de 0,6 s e teto de 2 interações/s, purificando com 2 acúmulos). |

As ações compartilham um orçamento de interações e atrasos de decisão. AFK é uma política do simulador com decisões de compra e Ascensão; não significa fechar o navegador. Os parâmetros completos estão em [behavior.ts](../../src/benchmark/behavior.ts).

## Fidelidade e conclusão

Produção, cooldowns, Bênção, Maldição dos Guardiões, automações, compra em massa (`Máximo`), autoclicker da Esfera e combate usam subpassos de até 0,1 segundo. RNGs independentes controlam visitas, críticos, calendário de milagres e falhas/erros de tempo nas ondas de APARAR (`parryAccuracy`). A confirmação de Ascensão é cobrada apenas na primeira Ascensão, espelhando a interface, e os seletores de compra em massa de Ritos/Relíquias são habilitados após assimilar **Memória Hermética** (`gn_memoria_selos`).

Todo duelo respeita a procissão do Círculo Sagrado (6 s antes de `beginBossCombat()`) e exige mais de 75 s restantes na visita antes de iniciar; em qualquer saída de visita (`leave`), o combate ativo recua. Na invasão final, a marcha de aproximação do Demiurgo dura 2,75 s antes da procissão. Anúbis pode ser tentado com prontidão ofensiva (`canDamageBoss`), inclusive a 0 Gnose; Hades, Odin e Caos Primordial ficam disponíveis após assimilar ao menos 1 nó do tier anterior e aguardam prontidão defensiva (`canWithstandBoss`). Os milagres durante lutas contra chefes nunca são coletados automaticamente, respeitando `miracleCatchChance` de cada perfil. Em vez de acerto de oráculo em 100%, cada perfil possui curva de leitura nas primeiras ondas especiais inéditas e `parryAccuracy` própria, podendo errar janelas ou cair em armadilhas de domínio (prato leve de Anúbis, corrente trancada de Hades, clique precoce no corvo de Odin ou ponteiro fora do centro no Demiurgo), acionando naturalmente a **Maldição do Guardião**, a **Riposte Gnóstica** (com 1 acúmulo ativo) e duelos de revanche para **Purificação** ao atingir `cursePurifyThreshold`.

A conclusão exige **Avatar Solar (Estágio 5), 21 nós assimilados, Caos Primordial derrotado e Demiurgo derrotado** (`isCampaignComplete()`). `time_limit` e `blocked` são execuções incompletas; o tempo observado nelas não é um tempo de vitória. A CLI com várias seeds separa conclusão, bloqueio e limite; estatísticas de tempo de vitória usam somente campanhas concluídas.

O simulador aceita modos de ausência visível (`visible`), aba oculta (`hidden`) e save offline (`save`) via `--absence=...` ou `SimulationOptions.absenceMode`. Os modos oculto/save usam a produção de ausência, limitada a 24 horas por crédito, sem ações manuais ou combate. Não misture essas condições em uma mesma comparação.

## Prioridades na árvore de Gnose

Os pares de investimento permitem priorizar automação, produção ou economia e comprar os demais caminhos depois. A calibração acompanha os 4 tiers de Gnose medidos em tempo de jogo presente (`presentDurationSec`, meta de 20–40 minutos ativos e 4–12 Ascensões por tier): da abertura da Gnose/Anúbis até Hades (Tier 1), de Hades até Odin (Tier 2), de Odin até Caos Primordial (Tier 3) e de Caos Primordial até o Demiurgo (Tier 4, incluindo os nós finais e **Olho do Infinito**). A análise e as medições históricas ficam em [cadência dos tiers](gnose-tier-cadence-2026-11-13.md), [ajuste posterior do bônus permanente](gnose-passive-ramp-2026-11-13.md) e [revisão 4](gnose-recalibration-2026-11-13.md).

`progression.gnoseTiers` registra início, vitória, duração total, duração presente (`presentDurationSec`), número de Ascensões e atendimento de cada meta sobre o tempo presente. Tiers incompletos não recebem duração nem contagem final. Os relatórios CLI/HTML exibem o tempo de jogo ativo por tier, além de derrotas, purificações e lutas com Riposte Gnóstica. Ausências entram apenas no tempo total decorrido do casual, sem distorcer o tempo ativo de cada tier.

As opções `purchasePriority: 'comfort'` e `purchasePriority: 'production'` do simulador permitem investigar decisões iniciais diferentes. Elas são políticas de benchmark e não garantem uma ordem de compra ideal para o jogador.

## Novas medições

Registre commit ou hashes dos arquivos, alterações locais, perfil/opções, seed, horizonte, modo de ausência, estado de conclusão, tempo presente e decorrido. Compare também reconstrução pós-Ascensão, intervalos sem avanço permanente e recursos/prontidão nos duelos. Reexecute após alterar economia, combate ou política do simulador.

As saídas ficam em `reports/` (ignorado pelo Git). Não reutilize resultados antigos como validação do jogo atual. Esta documentação não publica uma duração de campanha sem uma nova medição correspondente.

## Ferramentas

- `scripts/run-benchmark.mjs`: perfis padrão e distribuição entre seeds.
- `scripts/analyze-progression.mjs`: snapshots, Ascensões e compras de uma campanha.
- `scripts/calibrate-progression.mjs`: cenários de calibração com metadados e hashes, sem alterar o código do jogo.
- `scripts/summarize-progression.mjs`: agrega arquivos da mesma família de calibração e identifica execuções incompletas.

Fórmulas e limites de combate estão em [FormulasJogo.md](../../FormulasJogo.md).
