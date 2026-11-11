# Custos dos níveis adicionais de Relíquias — 10/11/2026

Cornucópia de Amalteia e Tocha de Prometeu mantêm os primeiros 20 níveis nos preços originais. Com Cripta Eterna, os níveis adicionais permanecem ilimitados, mas cada compra posterior custa 15% mais que a anterior:

```text
C(L) = base × 1,15^max(0, L − 19)
base = 200 (Cornucópia), 500 (Tocha)
L = nível atual antes da compra
Bônus de produção = 1 + 0,2 × nível
```

O custo exponencial acompanha um benefício linear: os níveis adicionais deixam de fornecer produção quase gratuita em saldos altos. A escolha de 15% oferece uma transição gradual, sem encarecer os primeiros 20 níveis nem cobrar retroativamente os níveis já restaurados. Saves antigos preservam os níveis e passam a pagar a curva atual nas compras seguintes.

O preço exibido representa a próxima compra. A opção Nerds mostra a fórmula. Compra máxima e Oficina usam a soma dos preços, incluindo separadamente o trecho fixo e a série geométrica quando atravessam o nível 20:

```text
S(n) = C_inicial × (1,15^n − 1) / 0,15
```

O cálculo usa `expm1` para estabilidade e uma busca binária com limite derivado do saldo para descobrir a quantidade máxima. Não percorre cada nível comprável. A Oficina continua limitada a 50 níveis por Relíquia por segundo e avalia o retorno pelo preço atual. As outras Relíquias mantêm preços e limites originais.

Os níveis não têm teto de design após a Cripta. Os cálculos respeitam a precisão de inteiros do JavaScript; preços além do intervalo numérico são tratados como inacessíveis e exibidos como ∞, sem travar compras ou automação.

## Validação

469 testes em 43 arquivos passaram e o build de produção foi aprovado. Testes específicos cobrem o início da curva, a travessia do nível 20, a soma em comparação com compras individuais, quantidades máximas, saldo insuficiente, saldos extremos e as Relíquias que continuam limitadas.

Três simulações com seed 786802, horizonte de 24 horas, ausência visível e passo máximo de 0,1 segundo concluíram os 20 nós e o último Guardião. O jogo já inclui a liberação do Avatar Solar sem Gnosis Suprema. Estes são testes de conclusão por políticas automatizadas, não uma promessa de duração para jogadores nem uma comparação isolada com o balanceamento anterior.

| Cenário | Concluiu | Tempo decorrido |
| --- | --- | --- |
| no-miracles | Sim | 3.16 h |
| intense | Sim | 3.07 h |
| casual | Sim | 5.43 h |

Saída completa ignorada pelo Git: `reports/relic-cost-scaling-2026-11-10.json`.

```bash
SCENARIOS=intense,casual,no-miracles nix-shell --run 'node scripts/calibrate-progression.mjs reports/relic-cost-scaling-2026-11-10.json 1 final 24'
```

Hashes SHA-256 das fontes relevantes:

- `src/config/relics.ts`: `fbc708955e483af72daf4a7962964efb168b1c1cfeea162520d0917e3ee99bdd`
- `src/systems/relicCosts.ts`: `eca2f4220b5e64830552b09c772aac8874feed3c5ae26da8bd830314a2039a1b`
- `src/core/GameState.ts`: `eb0c001fd2a392737a8a52224ca1e7cd588035d41afdb08c7596dad77cfd3e17`
- `src/config/gnose.ts`: `89662e19aaf3461d750539fcc896fbec597752185cca1241d0bf50c0afd8fec4`
- `src/benchmark/ProgressionSimulator.ts`: `1458cc5d69b0e3ca60531845a69920b6d8100e4b8b96da899601e1c3174ba366`
- `src/benchmark/behavior.ts`: `23dc27fb3b8b47b16d2161fbfe357e3d7bfed5fa7380aee8893b9792e0a23842`
