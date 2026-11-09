# Progressão e benchmark

O benchmark executa `GameStateManager` com políticas de interação reproduzíveis. A CLI e o painel de desenvolvimento usam o mesmo simulador; o painel roda em Web Worker. Uma simulação descreve seu perfil e suas opções, não uma duração garantida para jogadores.

## Executar

```bash
npm run benchmark -- --seed=42 --hours=24
npm run benchmark -- --seeds=1,2,3 --hours=24
mkdir -p reports
node scripts/run-benchmark.mjs --seed=42 --hours=24 --json > reports/benchmark.json
```

Com Nix, envolva o comando em `nix-shell --run '...'`. O horizonte padrão é 72 horas simuladas. A saída via npm pode incluir o cabeçalho do npm; para JSON diretamente processável use `node scripts/run-benchmark.mjs --seed=42 --hours=24 --json` dentro do ambiente Node.

## Perfis

| Perfil | Política |
| --- | --- |
| Referência | 2 cliques/s em rajadas de 10 segundos por minuto, 70% de captura pretendida de milagres. |
| Ativo intenso | Presença contínua, 2 cliques/s rotineiros, manutenção de Bênção e participação no combate. |
| Casual | 8 minutos presente a cada 20 minutos; 12 minutos ausente, 1 clique/s durante a presença e Bênção com alvo de 6 segundos. |
| AFK | Compras e prestígios continuam; cliques e Bênção manuais param após 10 minutos, com recuperação do primeiro Fiel após Gnose. Não coleta milagres. Nos combates, usa APARAR mesmo após os 10 minutos, com reação de 0,3 s e limite compartilhado de 2 interações/s. |

As ações compartilham um orçamento de interações e atrasos de decisão. AFK é uma política do simulador com decisões de compra e Ascensão; não significa fechar o navegador. Os parâmetros completos estão em [behavior.ts](../../src/benchmark/behavior.ts).

## Fidelidade e conclusão

Produção, cooldowns, Bênção, maldição, automações e combate usam subpassos de até 0,1 segundo. RNGs separados controlam críticos e calendário de milagres. A política decide quando comprar, ascender e desafiar; não substitui as validações do domínio. O acesso ao desafio não garante prontidão suficiente para vencer. Os quatro perfis usam a mesma seleção de APARAR, respeitando seus tempos de reação e orçamento de interações; o Casual só age quando está presente. As aparadas selecionam apenas o peso maior de Anúbis e deixam o menor expirar; toda tentativa realizada consome uma interação, mesmo se falhar.

A conclusão exige **20 nós assimilados e Caos Primordial derrotado**. `time_limit` e `blocked` são execuções incompletas; o tempo observado nelas não é um tempo de vitória. A CLI com várias seeds separa conclusão, bloqueio e limite; estatísticas de tempo de vitória usam somente campanhas concluídas.

O simulador aceita modos de ausência visível, aba oculta e save nas opções de campanha. Os modos oculto/save usam a produção de ausência, limitada a 24 horas por crédito, sem ações manuais ou combate. Não misture essas condições em uma mesma comparação.

## Novas medições

Registre commit ou hashes dos arquivos, alterações locais, perfil/opções, seed, horizonte, modo de ausência, estado de conclusão, tempo presente e decorrido. Compare também reconstrução pós-Ascensão, intervalos sem avanço permanente e recursos/prontidão nos duelos. Reexecute após alterar economia, combate ou política do simulador.

As saídas ficam em `reports/` (ignorado pelo Git). Não reutilize resultados antigos como validação do jogo atual. Esta documentação não publica uma duração de campanha sem uma nova medição correspondente.

## Ferramentas

- `scripts/run-benchmark.mjs`: perfis padrão e distribuição entre seeds.
- `scripts/analyze-progression.mjs`: snapshots, Ascensões e compras de uma campanha.
- `scripts/calibrate-progression.mjs`: cenários de calibração com metadados e hashes, sem alterar o código do jogo.
- `scripts/summarize-progression.mjs`: agrega arquivos da mesma família de calibração e identifica execuções incompletas.

Testes do simulador ficam em `src/benchmark/benchmark.test.ts`; fórmulas e limites de combate estão em [FormulasJogo.md](../../FormulasJogo.md).
