# Validação da Progressão — 29/10/2026

Relatório de implementação e validação de [PlanoProgressao.md](../../PlanoProgressao.md), com referência completa de fórmulas em [FormulasJogo.md](../../FormulasJogo.md) e artefatos brutos preservados em [`Base/`](../../Base/).

## 1. Resumo executivo e condições de aceitação

Todos os critérios de aceitação definidos em [PlanoProgressao.md](../../PlanoProgressao.md) foram atingidos na bateria final de **20 sementes** (`786802` a `786821`, resumo em [`Base/progression-final-summary.json`](../../Base/progression-final-summary.json)):

| Critério do plano | Meta | Resultado observado (20 sementes) | Status |
| --- | --- | --- | --- |
| Duração da campanha ativa de referência (`reference`) | < 20 h, mediana 14–16 h | Mediana **14,70 h**, pior **14,81 h** (20/20 concluídas) | Aprovado |
| Ativo sem milagres (`no-miracles`) | < 20 h, diferença ≤ 25% para referência | Mediana **16,04 h** (+9,1%), pior **16,12 h** (20/20 concluídas) | Aprovado |
| Intervalo entre avanços permanentes após 1ª ascensão | Normalmente 20–45 min, máximo ≤ 60 min | Máximo **46,68 min** (`reference`) e **50,37 min** (`no-miracles`) | Aprovado |
| Intervalo entre avanços relevantes na presença | Ganhos/decisões frequentes sem parede oculta | Máximo global **12,55 min** (`reference`); após 1ª ascensão P95 **2,31 min** | Aprovado |
| Recuperação a partir do 3º ciclo | ≤ min(10 min, 25% do ciclo anterior) | **0 falhas** em 360 ciclos medidos (`reference`, `no-miracles`, `intense`, `comfort`, `production`, `long`) | Aprovado |
| Quantidade de resets na rota saudável | 15–35 resets (teto 40); sem vantagem > 10% para spam | **20 resets** na rota saudável; `short` conclui em **14,29 h** (−2,8%) com **39 resets**; `immediate` (1 Gnose) **0/20** em 20 h | Aprovado |
| Produção após compras de Fervor/Fragmentos | 0 quedas involuntárias por consumo de estoque | **0 quedas** (`manualProductionDrops = 0` em todos os 240 runs da bateria) | Aprovado |
| Crédito de ausência e retorno (aba oculta / save) | Crédito único até 24 h, tolerância documentada | Erro relativo < `1e-8` (1 min, 10 min, 1 h, 24 h); `casual-hidden` e `casual-save` idênticos (**18,10 h** mediana) | Aprovado |
| Encerramento e Avatar Solar | Requisito explícito de Gnosis Suprema; uso antes de Caos | Solar (`1e30` Fé + Gnosis Suprema) alcançado antes de Caos nas **20/20** campanhas ativas | Aprovado |

---

## 2. Parâmetros escolhidos e mudanças por etapa

### Etapa 1 — Métricas e perfis de simulação
- [`CampaignMetrics`](../../src/benchmark/CampaignMetrics.ts): registra separadamente avanços por categoria (`permanent`, `unlock`, `avatar`, `boss`, `production`), intervalos máximos (`maxPermanentGapSec` após a 1ª ascensão e `maxRelevantGapSec`), recuperação da média móvel de 60 s de Fé/s do ciclo anterior, Gnose/minuto incluindo reconstrução, quedas imediatas após compras (`productionDrops`), participação de renda (`passive`, `clicks`, `miracles`), precisão de ETA dos objetivos e métricas de combate (`readiness`, fração de HP removida por fonte e interações).
- [`REFERENCE_BEHAVIOR`](../../src/benchmark/behavior.ts): perfil ativo de referência com rajadas de 10 s por minuto a 2 cliques/s na Esfera e coleta de 70% dos milagres, compartilhando orçamento finito de interação com compras, Bênção e combate.

### Etapa 2 — Estoques de ciclo (`Vp`, `Rp`) e ausência/retorno
- [`GameStateManager`](../../src/core/GameState.ts): introduz `fervorPeakThisRun` (`Vp`) e `relicPeakThisRun` (`Rp`), atualizados em `addFervor` e `addRelics` antes de compras automáticas, persistidos no save, iniciados a partir dos saldos conhecidos em saves legados (nunca de `totalFervorGenerated` / `totalRelicsGenerated`) e zerados em toda Ascensão Gnóstica (mesmo com Cripta Eterna).
- [`ElapsedTimeCredit`](../../src/systems/elapsedTime.ts): unifica o crédito de retorno de aba oculta e carregamento/importação de save usando o mesmo integrador em subpassos de `0,1 s`, limitado a 24 h e consumido exatamente uma vez por período oculto.

### Etapa 3 — Automações orientadas por objetivo e conforto
- Seletor de objetivo (`automatic`, `next_seal`, `avatar`, `gnose`) na interface e no estado:
  - [`getFollowerReservation`](../../src/core/GameState.ts): reserva Fé quando o objetivo ativo ou um marco intermediário (Selo/Avatar de menor custo na rota até um objetivo finito) está a até **180 s** pela taxa atual; fora da janela, `shouldInvestInFollower` compra apenas quando o investimento reduz o ETA até o objetivo.
  - `Auto-Ritos`: prioriza maior ganho marginal relativo por custo (`peso 0,15` para clique, `1,0` para os demais), respeitando reservas de Fervor e a exigência da Fênix.
  - `Auto-Relíquias`: poupa para a primeira *Pena Solar de Fênix* antes de distribuir compras pelos maiores retornos relativos por Fragmento.
  - *Memória Hermética*: libera compras manuais em lote para Ritos (até 100 níveis) e Relíquias (até o nível máximo), além de *Converter Máximo*.
  - *Bênção*: passa de `+2 s` para **+10 s por acionamento** (mantendo teto de 60 s e multiplicador 2×).

### Etapa 4 — Recalibração de Gnose e distribuição de poder
- **Selo da Gnose**: desbloqueado ao atingir o limiar de `1e15` Fé **sem descontar o saldo**, permitindo realizar a primeira Ascensão imediatamente.
- **Expoente de Ascensão**: candidato central **0,25 → 0,28** com *Olho de Trismegisto* (`PROGRESSION_BALANCE.ascensionExponent = 0.25`, `enlightenedExponent = 0.28`).
- **Distribuição de poder permanente e sustentação de ciclo**:
  - *Emanação Primordial* (`gn_init_faith`): além de −0,01 na escala de custo e 1.000 Fé iniciais, concede sinergia inicial `1 + Fiéis^0.5`, evoluindo para `1 + Fiéis^1.0` com *Congregação Esférica* e `1 + Fiéis^1.1` com *Coro Harmônico*.
  - Ressonância hermética por nó assimilado (`MR = 4^K`) em Fé/clique, Fé/s, Fervor/s e Fragmentos/s.
  - Ressonância de Fervor do ciclo (`RF = (1 + Vp / 1e18)^(2 * K / (K + 1))`), que sustenta ganhos contínuos de produção ao longo do ciclo sem usar histórico permanente e zera na Ascensão.
- **Reembolso de migração (`progressionRevision = 1`)**: saves anteriores recebem uma única vez a diferença positiva de preço em `gnosePoints`, sem alterar `totalGnoseEarned`.

### Etapa 5 — Milagres opcionais e encerramento
- **Milagres**: temporização baseada em segundos reais transcorridos (`dt`, independente de FPS) e recompensa `max(30, 15 * C, floor(30 * P))`, removendo o juro sobre o estoque de Fé que tornava milagres obrigatórios para furar paredes.
- **Avatares finais**: *Avatar do Eclipse* reduzido para `1e20` Fé com *Gnosis Suprema*; *Avatar Solar* exige explicitamente *Gnosis Suprema* e custa `1e30` Fé, tornando-se uma conquista ativa antes do combate contra *Caos Primordial*.

---

## 3. Evolução por entrega (3 sementes exploratórias, teto de 20 h)

Comparação sequencial sobre as mesmas sementes (`786802`–`786804`):

| Entrega / Experimento | Arquivo | `reference` (concluídas / horas) | `no-miracles` (concluídas / horas) | Maior espera permanente (`reference`) | Quedas de produção (`drops`) |
| --- | --- | --- | --- | --- | --- |
| Linha de base (antes das mudanças) | [`Base/progression-before.json.gz`](../../Base/progression-before.json.gz) | 0/3 (20,0 h · 16 nós) | 0/3 (20,0 h · 15 nós) | 199,8 min | 1.535 |
| Etapa 2+3 (Picos `Vp`/`Rp` + Automações por objetivo) | [`Base/progression-peaks-automation.json.gz`](../../Base/progression-peaks-automation.json.gz) | 3/3 (16,61–16,98 h) | 0/3 (20,0 h · 17 nós) | 113,3 min | 0 |
| Etapa 3 (Preços candidatos de conforto + Bênção 10 s) | [`Base/progression-comfort.json.gz`](../../Base/progression-comfort.json.gz) | 3/3 (16,36–16,76 h) | 0/3 (20,0 h · 17 nós) | 118,2 min | 0 |
| Etapa 4 — Expoente `0,22 → 0,25` (antes do ajuste de custos finais) | [`Base/progression-exponent-022.json.gz`](../../Base/progression-exponent-022.json.gz) | 3/3 (7,20–7,61 h) | 3/3 (7,91–8,11 h) | 56,8 min | 0 |
| Etapa 4 — Expoente `0,25 → 0,28` (candidato central bruto) | [`Base/progression-central.json.gz`](../../Base/progression-central.json.gz) | 3/3 (6,55–6,72 h) | 3/3 (7,22–7,47 h) | 56,5 min | 0 |
| Etapa 4 — Expoente `0,30 → 0,33` (rejeitado por compressão excessiva) | [`Base/progression-exponent-030.json.gz`](../../Base/progression-exponent-030.json.gz) | 3/3 (5,64–5,73 h) | 3/3 (6,07–6,18 h) | 57,0 min | 0 |
| Etapa 4–6 — Calibração integrada final (20 sementes) | [`Base/progression-final.json.gz`](../../Base/progression-final.json.gz) | 20/20 (mediana **14,70 h**) | 20/20 (mediana **16,04 h**) | **46,68 min** | **0** |

---

## 4. Resultados da bateria final (20 sementes × 12 cenários)

Dados consolidados em [`Base/progression-final-summary.json`](../../Base/progression-final-summary.json):

| Cenário | Concluídas | Mediana (h) | Pior caso (h) | Presença mediana (h) | Maior gap perm. (min) | Maior gap relev. (min) | Resets (mín–máx) | Falhas recup. (≥3º ciclo) | Quedas pós-compra | Solar antes de Caos |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `reference` | 20/20 | 14,70 | 14,81 | 14,70 | 46,68 | 12,55 | 20–20 | 0 / 360 | 0 | 20/20 |
| `no-miracles` | 20/20 | 16,04 | 16,12 | 16,04 | 50,37 | 14,85 | 20–20 | 0 / 360 | 0 | 20/20 |
| `intense` | 20/20 | 14,13 | 14,25 | 14,13 | 44,77 | 14,92 | 20–20 | 0 / 360 | 0 | 20/20 |
| `comfort` | 20/20 | 14,70 | 14,81 | 14,70 | 46,68 | 12,55 | 20–20 | 0 / 360 | 0 | 20/20 |
| `production` | 20/20 | 14,70 | 14,81 | 14,70 | 46,68 | 12,55 | 20–20 | 0 / 360 | 0 | 20/20 |
| `immediate` | 0/20 | — (limite 20 h) | — (1 nó) | 20,00 | 1.120,00 | 12,55 | 64–65 | 1.240 / 1.242 | 0 | 0/20 |
| `short` | 20/20 | 14,29 | 14,42 | 14,29 | 56,39 | 12,55 | 39–39 | 719 / 740 | 0 | 20/20 |
| `long` | 20/20 | 15,14 | 15,30 | 15,14 | 48,02 | 12,55 | 20–20 | 0 / 360 | 0 | 20/20 |
| `casual` | 20/20 | 17,80 | 18,14 | 7,20 | 96,01 | 19,10 | 20–20 | 38 / 360 | 0 | 20/20 |
| `casual-hidden` | 20/20 | 18,10 | 18,67 | 7,30 | 84,41 | 18,87 | 20–20 | 69 / 360 | 0 | 20/20 |
| `casual-save` | 20/20 | 18,10 | 18,67 | 7,30 | 84,41 | 18,87 | 20–20 | 69 / 360 | 0 | 20/20 |
| `absence` | 0/20 | — (limite 20 h) | — (0 nós) | 0,17 | 0,00 | 1.190,71 | 0–0 | 0 / 0 | 0 | 0/20 |

### Observações sobre os cenários
1. **Rota ativa de referência (`reference`)**: todas as 20 sementes terminam entre **14,58 h e 14,81 h**, dentro da janela-alvo de **14–16 h**, com cadência de ~35 min por nó nos 5 primeiros ciclos e ~44–45 min nos ciclos seguintes (ver [`Base/progression-price-fit-final-sustained.json`](../../Base/progression-price-fit-final-sustained.json)).
2. **Impacto de cada nó em economias reais salvas**: [`Base/progression-node-comparisons.json`](../../Base/progression-node-comparisons.json) compara o estado reconstruído com e sem cada nó, verificando ganhos distribuídos (mínimo de 4× em todas as taxas pela ressonância do nó, somado ao bônus específico do ramo) sem que um único nó explique sozinho milhares de vezes de salto.
3. **Políticas de reset**:
   - A política `immediate` (ascender sempre com 1 Gnose) não progride além do 1º nó em 20 h.
   - A política `short` (fracionar ciclos em ~90% do custo do próximo nó) realiza quase o dobro de resets (39 vs. 20) para ganhar apenas **2,8%** de tempo (14,29 h vs. 14,70 h), bem abaixo do limite de 10% estipulado no plano.
4. **Sessões casuais e ausência real**:
   - `casual-hidden` (retorno de aba oculta) e `casual-save` (recarregamento de save) produzem trajetórias idênticas (18,10 h de calendário, 7,30 h de presença), validando a equivalência entre os dois fluxos de retorno.
   - `absence` (10 min iniciais de presença seguidos de ausência total sem ações manuais) permanece em 0 nós e 0 resets após 20 h, separando claramente ausência real do arquétipo `afk` (que continua comprando e ascendendo).
