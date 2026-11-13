# Cadência dos tiers de Gnose — revisão 5 — 2026-11-13

> Histórico da revisão 5: a curva permanente foi substituída pelo [ajuste do bônus inicial](gnose-passive-ramp-2026-11-13.md). As medições abaixo não validam a curva atual.

A meta é 20–40 minutos de jogo ativo contínuo entre Guardiões, com cerca de 4–12 Ascensões para concluir cada tier. A calibração final atende às duas faixas nos quatro tiers em todas as 12 execuções ativas medidas.

## Janela de medição

- Tier I: primeira Ascensão até a vitória sobre Anúbis, incluindo essa primeira Ascensão na contagem. O prólogo até alcançar Gnose permanece separado.
- Tier II: vitória sobre Anúbis até vitória sobre Hades.
- Tier III: vitória sobre Hades até vitória sobre Odin.
- Tier IV: vitória sobre Odin até vitória sobre Caos Primordial.
- As Ascensões dos tiers II–IV são contadas depois da vitória que abre o tier e até a vitória que o encerra. Tiers incompletos não recebem duração ou contagem final.

As faixas orientam o balanceamento, sem temporizadores nem exigência artificial de reiniciar um número fixo de vezes. Um jogador pode poupar Gnose e fazer menos Ascensões, ou escolher um ritmo diferente. As simulações de benchmark medem políticas de interação, não uma duração garantida para qualquer partida.

## Mudanças aplicadas

1. Cada Guardião exige todos os nós do tier anterior: 6 antes de Anúbis, 6 antes de Hades, 4 antes de Odin e todos os 20 antes de Caos Primordial. Os indicadores de bloqueio usam os mesmos totais do catálogo.
2. O bônus permanente da Gnose total é `1 + 7000 × Gnose total^0,35`. O coeficiente maior reduz o custo de reconstruir o culto a cada Ascensão. Não depende do saldo disponível nem da quantidade de nós.
3. A ressonância de Fervor passa de expoente 2 para 0,1. Esse crescimento mais suave evita que a etapa final seja atravessada em poucos minutos.
4. Gnosis Suprema precede os aperfeiçoamentos de Fervor e Fragmentos. Olho do Infinito exige ambos e entrega as automações gratuitas como recompensa final, evitando que elas eliminem os investimentos do Tier IV.
5. Os custos foram recalibrados em conjunto com essas mudanças. Mantêm as escolhas de prioridade e todos os caminhos compráveis. Não há bônus genérico de produção por nó.

## Custos e pré-requisitos atuais

| Tier | Upgrade | Gnose | Pré-requisitos |
| --- | --- | ---: | --- |
| 1 | Emanação Primordial | 1 | — |
| 1 | Memória Hermética | 2 | gn_init_faith |
| 1 | Culto Autônomo | 4 | gn_memoria_selos |
| 1 | Chama Astral | 5 | gn_init_faith |
| 1 | Ruptura Automática | 8 | gn_memoria_selos |
| 1 | Alquimia Astral | 10 | gn_init_faith |
| 2 | Liturgia Autônoma | 20 | gn_automation, gn_init_fervor |
| 2 | Oficina Autônoma | 25 | gn_relic_gain |
| 2 | Cripta Eterna | 48 | gn_memoria_selos |
| 2 | Congregação Esférica | 60 | gn_memoria_selos |
| 2 | Vigília Perpétua | 120 | gn_init_fervor |
| 2 | Convergência dos Fiéis | 150 | gn_init_faith, gn_followers_syn |
| 3 | Coro Harmônico | 30.000 | gn_followers_syn |
| 3 | Olho de Trismegisto | 36.000 | gn_bencao_eterna |
| 3 | Alquimia Hermética | 200.000 | gn_relic_gain, gn_keep_relics |
| 3 | Fogo Hermético | 240.000 | gn_init_fervor |
| 4 | Gnosis Suprema | 300.000 | gn_gnose_mult, gn_fu1_boost, gn_followers_cubic |
| 4 | Fogo Empíreo | 600.000 | gn_init_fervor, gn_fu1_boost, gn_apotheosis |
| 4 | Opus Perfeito | 720.000 | gn_relic_refinement, gn_apotheosis |
| 4 | Olho do Infinito | 2.200.000 | gn_automation, gn_empyrean_fire, gn_perfect_opus |

## Resultado principal: jogo ativo

Três seeds (786802, 786803 e 786804), passo de 0,1 segundo, modo `visible`, horizonte de 8 horas. Quatro políticas: referência, ativo intenso, prioridade em automação e prioridade em produção. A referência usa 2 cliques/s em rajadas e orçamento de 3 interações/s; o ativo intenso é mantido como comparação. As prioridades mudam a compra entre opções iniciais de preços próximos.

| Tier | Intervalo observado | Ascensões | Execuções com ambas as metas |
| --- | --- | ---: | ---: |
| 1 | 27.3–32.5 min | 6 | 12/12 |
| 2 | 28.9–31.3 min | 6 | 12/12 |
| 3 | 24.0–29.1 min | 4 | 12/12 |
| 4 | 25.6–30.1 min | 4 | 12/12 |

As 12 campanhas concluíram com Avatar Solar, 20 nós e vitória sobre Caos Primordial. As 48 janelas de tier atenderam às duas metas. Os resultados detalhados guardam separadamente `timeInTarget` e `ascensionsInTarget`; concluir a campanha por si só não aprova a cadência.

## Controle casual e ausências

Duas seeds (786802 e 786803), sessões de 8 minutos a cada 20 minutos, horizonte de 12 horas. Ambas concluíram. O tempo presente abaixo integra as janelas de visita, sem contabilizar os intervalos de 12 minutos ausentes; o total calculado foi conferido contra `presentTimeSec` do simulador.

| Tier | Tempo decorrido | Tempo presente | Ascensões |
| --- | --- | --- | ---: |
| 1 | 101.0–114.3 min | 41.0–42.3 min | 6 |
| 2 | 60.4–60.4 min | 24.4–24.4 min | 4–5 |
| 3 | 60.8–61.8 min | 24.8–25.8 min | 4 |
| 4 | 42.3–42.3 min | 18.3–18.3 min | 4 |

O casual mantém a faixa de Ascensões em todos os tiers, mas não atende à faixa de 20–40 minutos de relógio. No tempo presente, os tiers I e IV também ficam ligeiramente fora dessa faixa. A meta principal foi calibrada para jogo ativo contínuo; pausas, ausência real e saves avançados não recebem promessa de duração.

## Compatibilidade e validação

A revisão econômica sobe de 4 para 5. As tabelas de preços anteriores permitem devolver uma única vez as reduções dos nós já assimilados. Aumentos não geram dívida. A Gnose total obtida, os nós, as vitórias e os saldos acumulados são preservados. Olho do Infinito já assimilado não é revogado por seus novos pré-requisitos; portanto saves avançados podem progredir mais rápido que as faixas para uma partida nova.

Conferências manuais executadas para saves das revisões 0–5: saldo esperado após devolução, segundo carregamento sem devolução duplicada, Gnose total intacta, nós e vitórias mantidos. Também foram conferidos bloqueios antes do último nó de cada tier, abertura com tier completo, ausência de ciclo nos novos pré-requisitos e produção inalterada ao comprar Culto Autônomo sem avançar o tempo. O build e `git diff --check` passaram. Não foram criados testes automatizados.

O benchmark agora expõe `progression.gnoseTiers`: início, conclusão, duração, Ascensões e atendimento de cada meta por tier. A CLI e o relatório HTML exibem esses dados, incluindo estados incompletos.

## Reprodução

```bash
nix-shell --run 'SCENARIOS=reference,intense node scripts/calibrate-progression.mjs reports/gnose-cadence-v5-active.json 3 final 8'
nix-shell --run 'SCENARIOS=comfort,production node scripts/calibrate-progression.mjs reports/gnose-cadence-v5-choices.json 3 final 8'
nix-shell --run 'SCENARIOS=casual node scripts/calibrate-progression.mjs reports/gnose-cadence-v5-casual.json 2 final 12'
nix-shell --run 'npm run build'
```

Os relatórios em `reports/` são ignorados pelo Git. Os JSONs registram custos, pré-requisitos, opções, metas e hashes. `gnose-cadence-v5-manifest.json` registra o commit-base e os hashes abaixo, com alterações locais; `gnose-cadence-v5-manual-checks.txt` guarda as conferências de migração. `gnose-cadence-v5.html` mostra as faixas medidas.

- `src/config/gnose.ts`: `5d19030e354c7f633fe2328cbb7705334ca160569e4fc47582544d5eab0ead67`
- `src/config/bosses.ts`: `f3858df8c66a5988d9677ec213d401e730ad80697f069a4edcea2fc90726889d`
- `src/core/GameState.ts`: `03cefc0af18e91ce77967eeb0bc0b2bed38ce2a66c94717d6722e4a907f16d8c`
- `src/systems/calculations.ts`: `4c71dcf1936cba41e79bba02cecfc623eccff818d14f7b3b2bc991772b793b57`
- `src/benchmark/CampaignMetrics.ts`: `df41bff22d8d7e1121bb8e0a8f532ec3eaa3758556589c0927c812c1361684a7`
- `src/benchmark/ProgressionSimulator.ts`: `cf1d99f4640327f3d44b076cee7e44e56282ccbdc6b7fe659d6f7a7caf8d0929`
- `src/benchmark/behavior.ts`: `a5f9b6e40dd9b01f99bf086134756e8be7da858848ab4b4dc47ef510a6256008`
