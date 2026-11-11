# Suavização dos custos da Gnose — 10/11/2026

Implementação solicitada após o diagnóstico em [gnose-balance-review-2026-11-10.md](gnose-balance-review-2026-11-10.md).

## Alterações

O catálogo agora está ordenado por tier e custo crescente, com cada pré-requisito antes de seus dependentes. A Câmara usa essa ordem fixa, sem mudar a posição dos cartões após compras. Os bloqueios por Guardião e os efeitos dos nós foram preservados.

Foram reduzidos 13 preços iniciais e intermediários; Emanação Primordial permanece em 1 Gnose. Os seis últimos preços foram preservados, pois as simulações já mostravam um trecho final rápido. Uma alternativa com reduções adicionais nesses seis nós encurtou ainda mais esse trecho e foi descartada.

| Nó | Antes | Agora |
| --- | ---: | ---: |
| Memória Hermética | 57 | 24 |
| Culto Autônomo | 1100 | 300 |
| Ruptura Automática | 26000 | 4000 |
| Chama Astral | 290000 | 60000 |
| Alquimia Astral | 3.4e+08 | 1e+08 |
| Liturgia Autônoma | 3.5e+06 | 800000 |
| Oficina Autônoma | 3.5e+07 | 1e+07 |
| Cripta Eterna | 2.5e+09 | 1e+09 |
| Congregação Esférica | 1.9e+10 | 1e+10 |
| Vigília Perpétua | 2.9e+11 | 1e+11 |
| Convergência dos Fiéis | 2.3e+12 | 1e+12 |
| Coro Harmônico | 1.8e+13 | 1e+13 |
| Olho de Trismegisto | 1.5e+14 | 1e+14 |

## Compatibilidade dos saves

A revisão de progressão passa de 1 para 2. Ao carregar um save da revisão 1, cada nó já comprado devolve somente `max(0, preço anterior − preço atual)`. A Gnose total acumulada e o progresso são preservados. O save seguinte registra revisão 2 e não recebe nova devolução. Exemplo da captura: Emanação + Memória, saldo 4, passa a saldo 37 pela devolução de 33.

Saves sem revisão seguem os preços históricos conhecidos, sem supor que pagaram os valores maiores da revisão 1. As migrações antigas continuam funcionando.

## Medições

As medições usam campanhas novas, passo máximo de 0,1 s, ausência visível e horizonte de 24 horas. São políticas automatizadas do simulador, não tempos garantidos para jogadores.

Na seed 42, a comparação com os arquivos do diagnóstico anterior foi:

| Perfil | Antes | Depois |
| --- | --- | --- |
| Ativo intenso | 8h30 | 5h56 |
| Casual | 12h27 | 9h27 |

O maior intervalo entre compras após a primeira Emanação caiu aproximadamente de 42,7 para 36,2 minutos no ativo e de 98,1 para 80,0 minutos no casual. O início até a primeira Emanação continua igual. O trecho final ainda acelera pelos efeitos acumulados; esta alteração não tenta recalibrar as fórmulas de produção.

A validação do código final usou seeds 786802, 786803 e 786804:

| Cenário | Conclusões | Tempo decorrido de campanhas concluídas |
| --- | --- | --- |
| Ativo intenso | 3/3 | 5.94–6.08 h |
| Casual | 3/3 | 9.13–9.46 h |
| Referência sem milagres | 3/3 | 6.43–6.68 h |
| Ausência após os primeiros 10 minutos | 0/3 | Incompletas no limite de 24 h |

O cenário de ausência não realiza compras nem Ascensões após sair: a falta de conclusão é esperada e não é contabilizada como vitória.

Dados detalhados (ignorados pelo Git): `reports/gnose-candidates-2026-11-10.json`, `reports/gnose-final-candidate-2026-11-10.json` e `reports/gnose-smoothed-2026-11-10.json`. O último inclui custos, coeficientes, hashes das fontes, opções e resultados completos. O cenário sem milagres da validação usa o comportamento de referência, diferente do ativo intenso sem milagres do diagnóstico inicial; seus tempos não devem ser comparados diretamente.

Reprodução da validação:

```bash
SCENARIOS=intense,casual,no-miracles,absence nix-shell --run 'node scripts/calibrate-progression.mjs reports/gnose-smoothed-2026-11-10.json 3 final 24'
```

Validação automatizada: 447 testes em 41 arquivos e `npm run build` aprovados. Os novos testes verificam ordem, alcance dos pré-requisitos, reduções de preço, devolução única e compatibilidade com saves sem revisão.

Hashes SHA-256 das fontes da medição:

- `src/config/gnose.ts`: `5b51ce9474303f6003d738ecab5d721b89efa2d0af83e49ca4017c7262283f65`
- `src/core/GameState.ts`: `4ff6e3ae058320e18636d31db14189bf0eeed92fff036892ee44ed9243b76ba5`
- `src/benchmark/ProgressionSimulator.ts`: `3661f2a4762c46c748cfb49d1b43ba6aa49665167110bcd667b307adda9199bb`
- `src/benchmark/behavior.ts`: `23dc27fb3b8b47b16d2161fbfe357e3d7bfed5fa7380aee8893b9792e0a23842`
- `src/systems/calculations.ts`: `d786e26d3d69bb88173d9c37b18782259e3a52c080ed23a64afcd3e4b01bdbc4`
