# Recalibração da Gnose sem bônus por nó — 2026-11-13

> Histórico da revisão 4. Os custos e as metas atuais estão na [cadência da revisão 5](gnose-tier-cadence-2026-11-13.md).

A revisão 4 altera somente os preços dos 20 nós e a migração de seus preços anteriores. Mantém os efeitos individuais, pré-requisitos, alternativas de investimento e requisitos dos Guardiões. Não reintroduz o multiplicador genérico de produção por nó. A Gnose total obtida continua concedendo seu bônus permanente.

## Diagnóstico e critério

A curva da revisão 3 foi definida quando os nós ainda concediam produção genérica de 4×. Sem esse multiplicador, a referência de seed 786802 atingiu o limite de 24 horas com apenas 2 nós e nenhum Guardião derrotado. Esse resultado é incompleto e não representa tempo de vitória.

O objetivo desta recalibração é permitir concluir a campanha sob as políticas de referência, produção, automação, ativo intenso e casual, mantendo escolhas iniciais com preços distintos e próximos. Não há uma duração de campanha contratada: os tempos abaixo pertencem às políticas do simulador. As fórmulas de produção e os efeitos dos nós não foram alterados para atingir esses resultados.

Uma curva intermediária ainda terminou com 8 nós em 24 horas (referência, seed 42). A curva final aproxima os preços do ganho de Gnose efetivamente disponível em cada etapa. O par inicial custa 4/5 Gnose, permitindo optar por automação de Fiéis ou melhoria de Fervor. Os pares seguintes mantêm preços próximos e todos permanecem compráveis.

Depois de Gnosis Suprema, as automações gratuitas e a redução de custos aceleram muito o ganho de Gnose. Por isso os aperfeiçoamentos finais têm preços de 1e12/1,2e12: a dupla não fica imediatamente disponível com o saldo que compra Gnosis Suprema. Essa distância de preço pertence a uma economia de fim de campanha, não à curva inicial de 1 a 6.000 Gnose.

## Preços aplicados

| Tier | Upgrade | Gnose |
| --- | --- | ---: |
| 1 | Emanação Primordial | 1 |
| 1 | Memória Hermética | 2 |
| 1 | Culto Autônomo | 4 |
| 1 | Chama Astral | 5 |
| 1 | Ruptura Automática | 8 |
| 1 | Alquimia Astral | 10 |
| 2 | Liturgia Autônoma | 16 |
| 2 | Oficina Autônoma | 20 |
| 2 | Cripta Eterna | 40 |
| 2 | Congregação Esférica | 48 |
| 2 | Vigília Perpétua | 100 |
| 2 | Convergência dos Fiéis | 120 |
| 3 | Coro Harmônico | 240 |
| 3 | Olho de Trismegisto | 300 |
| 3 | Alquimia Hermética | 800 |
| 3 | Fogo Hermético | 1000 |
| 4 | Olho do Infinito | 2400 |
| 4 | Gnosis Suprema | 6000 |
| 4 | Fogo Empíreo | 1e12 |
| 4 | Opus Perfeito | 1.2e12 |

## Validação da progressão

Horizonte de 24 horas, modo de ausência `visible`, passo de 0,1 segundo, seeds 786802 e 786803 nos cinco cenários abaixo. Cada conclusão exige Avatar Solar, 20 nós e Caos Primordial derrotado. O casual inclui suas ausências no tempo decorrido. As opções de prioridade mudam a escolha entre upgrades iniciais de preços próximos; não são uma prova de estratégia ótima.

| Política | Conclusões | Tempo decorrido medido | Maior intervalo sem avanço permanente |
| --- | ---: | --- | --- |
| Referência | 2/2 | 12h09–12h10 | 61 min |
| Prioridade em automação | 2/2 | 12h09–12h10 | 61 min |
| Prioridade em produção | 2/2 | 12h11–12h12 | 61 min |
| Ativo intenso | 2/2 | 11h46–11h55 | 60 min |
| Casual (8 min a cada 20 min) | 2/2 | 17h23–17h43 | 94 min |

O perfil AFK também concluiu em 16h53 (seed 42, horizonte de 48 horas). Esse perfil continua tomando decisões de compra, Ascensão e aparadas; não equivale a deixar o jogo fechado. Ao todo, 11/11 execuções finais concluíram. O maior intervalo sem avanço permanente inclui a reconstrução pós-Ascensão; não significa ausência de compras ou produção.

## Saves e conferências manuais

- Revisões 0, 1, 2 e 3 devolvem uma vez as reduções conhecidas dos upgrades já assimilados. A revisão 4 não devolve novamente.
- Salvar e recarregar após a migração mantém o mesmo saldo, a mesma Gnose total obtida e os mesmos nós.
- Uma compra de Culto Autônomo, sem avançar o tempo, não altera Fé por clique, Fé/s, Fervor/s nem Fragmentos/s. Não existe bônus genérico por nó.
- Todos os pré-requisitos existem e custam menos que seus dependentes; a tabela mantém as duplas de investimento e a ordem por custo.
- Validação de compilação: `nix-shell --run 'npm run build'`. Não foram criados testes automatizados.

## Reprodução e artefatos

```bash
nix-shell --run 'SCENARIOS=reference,comfort,production node scripts/calibrate-progression.mjs reports/gnose-revision-4-choices.json 2 final 24'
nix-shell --run 'SCENARIOS=intense,casual node scripts/calibrate-progression.mjs reports/gnose-revision-4-profiles.json 2 final 24'
```

Para reproduzir o perfil AFK com a CLI geral, use `nix-shell --run 'node scripts/run-benchmark.mjs --seed=42 --hours=48 --json'` e consulte o resultado `afk` (a CLI também executa os demais perfis).

Os JSONs e a visualização ficam em `reports/` (ignorado pelo Git): `gnose-revision-3-without-node-bonus.json`, `gnose-revision-4-choices.json`, `gnose-revision-4-profiles.json`, `gnose-revision-4-afk.json`, `gnose-revision-4-manifest.json` e `gnose-revision-4.html`. Os relatórios guardam preços, opções e hashes; o manifesto registra os hashes finais e o commit-base de uma árvore com alterações locais.

Hashes dos arquivos usados na calibração final:

- `src/config/gnose.ts`: `29857c6275c6988f5407f49e4e91accefd3b61fd05d006a27099d5bab5f68a4f`
- `src/core/GameState.ts`: `69b8eeed495e4974b2d32e2eff9506d98d26d813ba1e0727f850b1d7bc1b038d`
- `src/benchmark/ProgressionSimulator.ts`: `cf1d99f4640327f3d44b076cee7e44e56282ccbdc6b7fe659d6f7a7caf8d0929`
- `src/benchmark/behavior.ts`: `a5f9b6e40dd9b01f99bf086134756e8be7da858848ab4b4dc47ef510a6256008`
- `src/systems/calculations.ts`: `8ce6651c0238bce3815e3f2b5658b9099e23c1a67f14714f387f0ff2727d47a4`
- `src/config/bosses.ts`: `3bf11b5565a4faf13dca81301da918ac31f937a834ad7b18f8d89ca5f8e43f6b`
