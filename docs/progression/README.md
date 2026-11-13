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
| Referência | 2 cliques/s em rajadas de 10 segundos por minuto e nos combates (teto de 3 interações/s), 70% de captura pretendida de milagres (pátio e combate), Bênção e APARAR. |
| Ativo intenso | Presença contínua, 2 cliques/s rotineiros (5 cliques/s em combate), manutenção de Bênção e participação completa no combate (APARAR e milagres). |
| Casual | 8 minutos presente a cada 20 minutos; 12 minutos ausente, 1 clique/s durante a presença, Bênção 2× após compras até 12 segundos e APARAR/milagres nos combates (2 cliques/s) durante as visitas. |
| AFK | Compras e prestígios contínuos (atraso de 10 s); cliques e Bênção manuais param após 10 minutos, com recuperação do primeiro Fiel após Gnose quando necessário. Não coleta milagres manualmente. Nos combates, usa apenas APARAR com reação de 0,6 s e limite compartilhado de 2 interações/s. |

As ações compartilham um orçamento de interações e atrasos de decisão. AFK é uma política do simulador com decisões de compra e Ascensão; não significa fechar o navegador. Os parâmetros completos estão em [behavior.ts](../../src/benchmark/behavior.ts).

## Fidelidade e conclusão

Produção, cooldowns, Bênção, maldição, automações, autoclicker da Esfera e combate usam subpassos de até 0,1 segundo. RNGs separados controlam críticos (incluindo o autoclicker do Tier 1 da Gnose) e calendário de milagres. A confirmação de Ascensão é cobrada apenas na primeira Ascensão, espelhando a interface. Anúbis pode ser tentado com prontidão ofensiva (`canDamageBoss`), inclusive zero Gnose; os demais aguardam prontidão defensiva (`canWithstandBoss`). Todos exigem pelo menos 15 s restantes na visita antes de iniciar o duelo; em qualquer saída de visita (`leave`), o combate ativo recua. Os quatro perfis usam a mesma seleção de APARAR, respeitando seus tempos de reação e orçamento de interações; os perfis com Esfera manual ativa também acionam milagres de combate conforme `miracleCatchChance`, enquanto os milagres do pátio pausam durante duelos. As aparadas selecionam apenas o peso maior de Anúbis e deixam o menor expirar; toda tentativa realizada consome uma interação, mesmo se falhar.

A conclusão exige **Avatar Solar (Estágio 5), 20 nós assimilados e Caos Primordial derrotado** (`isCampaignComplete()`). `time_limit` e `blocked` são execuções incompletas; o tempo observado nelas não é um tempo de vitória. A CLI com várias seeds separa conclusão, bloqueio e limite; estatísticas de tempo de vitória usam somente campanhas concluídas.

O simulador aceita modos de ausência visível (`visible`), aba oculta (`hidden`) e save offline (`save`) via `--absence=...` ou `SimulationOptions.absenceMode`. Os modos oculto/save usam a produção de ausência, limitada a 24 horas por crédito, sem ações manuais ou combate. Não misture essas condições em uma mesma comparação.

## Prioridades na árvore de Gnose

Os pares de investimento permitem priorizar automação, produção ou economia e comprar os demais caminhos depois. A revisão 5 calibra 20–40 minutos de jogo ativo e 4–12 Ascensões por tier, medidos da primeira Ascensão até Anúbis e depois entre vitórias consecutivas. Todos os nós do tier antecedem o próximo Guardião. Olho do Infinito é a recompensa final, após Gnosis Suprema e os dois aperfeiçoamentos. A análise e as medições atuais ficam em [cadência dos tiers](gnose-tier-cadence-2026-11-13.md); o [ajuste posterior do bônus permanente](gnose-passive-ramp-2026-11-13.md) substitui a curva e suas medições; a [revisão 4](gnose-recalibration-2026-11-13.md) é histórica.

`progression.gnoseTiers` registra início, vitória, duração, número de Ascensões e atendimento de cada meta, separadamente. Tiers incompletos não recebem duração nem contagem final. Os relatórios CLI/HTML também exibem os intervalos. Ausências entram no tempo decorrido do casual e podem ultrapassar a meta; não são tempo de jogo ativo.

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
