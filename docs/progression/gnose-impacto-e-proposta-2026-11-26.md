# Impacto dos 20 nós da Gnose e proposta de balanceamento

Os efeitos e os preços candidatos das tabelas foram aplicados na revisão 10. Os dados abaixo comparam a revisão 9 e o protótipo. A validação do código aplicado está no final do relatório.

A árvore tem picos de poder altos, sobretudo em **Coro Harmônico**, **Fogo Empíreo** e **Olho do Infinito**. A duração dos tiers, porém, continua acima da meta registrada de 20–40 minutos ativos e 4–12 Ascensões na maior parte das medições. Na campanha ativa da seed 786802, passaram-se **74 min** entre Memória do Opus e Alquimia Hermética. Em seguida, uma única Ascensão financiou **cinco nós dos tiers III e IV em cerca de 10 s**. A revisão precisa reduzir tanto os picos de poder quanto o intervalo entre compras relevantes.

## Tier I · Despertar e automação

| Nó · custo atual em Gnose | Impacto atual | Proposta |
| --- | --- | --- |
| **Memória Hermética** · 2 | Abre e preserva a Encarnação, além de liberar as compras em lote. Na compra observada, a Encarnação estava fechada e o nó iniciou a geração em 35 Fervor/s. | Manter. É uma abertura de sistemas e reduz o trabalho de reconstrução nas Ascensões. |
| **Chama Astral** · 4 | Aumenta a base de produção do Rito de Fervor de 2 para 2,18 e reduz a escala de custo de 1,80 para 1,75. Ao nível 50, o efeito do Rito fica **2,46×** maior e o próximo nível custa **24,4%** do original. Com Encarnação fechada ou Rito no nível zero, o ganho de produção fica adiado. | Manter nesta rodada. É a especialização inicial de Fervor e concentra o crescimento da base do Rito. |
| **Culto e Ruptura Autônomos** · 6 | Abre Selos elegíveis e recruta Fiéis em lote a cada segundo, pagando os custos. Pode trocar saldo de Fé por produção justo quando o jogador pretende Ascender. | Manter a sequência Selos → Fiéis e a cobrança. Em rodada separada, testar uma reserva opcional para o recrutamento, com orçamento `máx(0, Fé − reserva)` e reserva zero por padrão. |
| **Alquimia Astral** · 8 | Dá **2,5×** Fragmentos antes mesmo da Fênix. Com a Fênix e Rito no nível 20, o efeito total é **3,05×** e o próximo nível custa **66,8%** do original. | Manter. Ajuda a comprar a primeira Fênix e o Draupnir, quando a Transmutação ainda pode depender de gastar toda a Fé. |
| **Relíquias Ilimitadas** · 10 | Abre níveis 21+ da Cornucópia e da Tocha. Cada nível dá +20 pontos percentuais no multiplicador da própria Relíquia. A primeira compra extra custa 1,15× o preço-base, a próxima 1,15²×, e assim por diante. Com 40 níveis, a Relíquia dá 9× ante 5× no limite antigo. | Manter. O custo crescente já reduz o retorno marginal, e o nó só começa a render ao chegar ao limite. |

## Tier II · Persistência e economia

| Nó · custo atual em Gnose | Impacto atual | Proposta |
| --- | --- | --- |
| **Emanação Primordial** · 20 | Inicia o ciclo com 1.000 Fé, muda a escala dos Fiéis de 1,10 para 1,09 antes de Hermes e dá `1 + 0,025√N` de Fé. No save com 78 Fiéis, deu **+22% de Fé/s** e reduziu à metade o preço do próximo Fiel. | Manter. A recuperação inicial e o desconto dão valor ao nó mesmo depois que a Congregação substitui a sinergia. |
| **Cripta Eterna** · 25 | Preserva 100% de Fênix, Hermes, Draupnir e Arca, e 50% da Cornucópia e da Tocha. O saldo de Fragmentos volta a zero. A Fênix mantém o bônus de Fervor assim que a Encarnação está disponível. O Draupnir gera Fragmentos após a reabertura do Selo correspondente, e a Arca volta a ganhar força conforme os Fragmentos se acumulam. | Manter **100% / 50%**. É o principal investimento de reconstrução pós-Ascensão. |
| **Liturgia e Oficina Autônomas** · 30 | Automatiza Ritos e restauração de Relíquias, com prioridade para a primeira Fênix e reserva de Fervor para Selos. O efeito vem da frequência das compras. Em cinco minutos, o clone automatizado comprou 21 níveis de Cornucópia e 18 de Tocha além do clone sem compras manuais, além de investir em Ritos. | Manter a automação paga e os controles separados. Avaliar seu valor em campanha com compras manuais ativas e durante a reconstrução automática. |
| **Vigília Perpétua** · 48 | Sustenta a Bênção de **2× Fé/s** e compra estágios da Encarnação. No save isolado, chegou ao Avatar Ancestral em cinco minutos enquanto o clone sem decisões manuais permaneceu no Neófito. O salto de Fervor veio da evolução comprada. | Manter a Bênção em 2× e a evolução paga. O ganho direto da Bênção é maior quando o jogador teria dificuldade em mantê-la ativa. |
| **Congregação Esférica** · 150 | Troca `1 + 0,025√N` por `1 + √N` para Fé por clique e Fé/s. Deu **12,77×** no save com 299 Fiéis. É o maior salto imediato dos tiers iniciais. | Manter na primeira rodada, dado o tempo observado até Odin. Se a curva inicial melhorar, testar o meio-termo `1 + 0,5√N` com preço recalibrado. |

## Tier III · Poder do culto

`N` é o total de Fiéis e `L` é o nível atual do Rito pertinente. Os multiplicadores novos se aplicam sobre o efeito do Rito já melhorado pelo Tier I.

| Nó · custo atual | Impacto atual | Proposta · preço candidato |
| --- | --- | --- |
| **Convergência dos Fiéis** · 1.200 | Antes de Hermes, a escala passa de 1,09 para 1,075. No save com Hermes completo, passa de 1,065 para o piso 1,05. Com 755 Fiéis, o próximo ficou **44,8 mil vezes mais barato**. A Fé/s após cinco minutos ficou **2,11×** maior. O retorno efetivo é menor que o desconto no próximo Fiel porque cada compra seguinte volta a encarecer. | Aplicar **60% de desconto em cada Fiel**, mantendo a escala anterior e o efeito de Hermes. Aplicar o mesmo preço na compra individual, Máximo e automação. **750 Gnose.** |
| **Coro Harmônico** · 1.500 | Troca `1 + √N` por `1 + N`. A compra deu **25,36× Fé/s** com 691 Fiéis. Em cinco minutos, o clone com o nó chegou ao Avatar Solar e o outro, ao Eclipse. O Rito Fé/s por Fiéis já inclui um termo linear em Fiéis, além da produção-base por Fiel. | Trocar a sinergia por `1 + √N × (1 + 2N/(N + 500))`. Dá **2,12×** sobre Congregação com 691 Fiéis e se aproxima de **3×** em cultos maiores. Em cinco minutos, ambos os clones ficaram no Eclipse. **1.200 Gnose.** |
| **Olho de Trismegisto** · 36.000 | Muda o expoente de Gnose por Ascensão de 0,25 para 0,28. Na compra, o prêmio previsto passou de **1.522 para 3.669**. Com `10^38` Fé, rende **4,90×** sobre o ganho sem o nó. A Gnose total obtida também acelera Fé, Fervor e prontidão para Guardiões. | Usar `⌊(Fé / 10^15)^0,26⌋` a partir de `10^15` Fé. Dá **1,34×** no mesmo save e **1,70×** com `10^38` Fé. **6.000 Gnose.** |
| **Memória do Opus** · 45.000 | Com Cripta, aumenta de 50% para 80% a retenção das duas Relíquias ilimitadas. Ao ascender diretamente a partir de 54/50 níveis, guarda **43/40** em vez de **27/25**. | Reter `⌊0,65 × nível⌋` com Cripta. No mesmo exemplo, guarda **35/32**. **9.000 Gnose.** |
| **Alquimia Hermética** · 200.000 | Troca a base do Rito de Fragmentos de 3,10 para 3,40 e a escala de preço de 4,90 para 4,60. No nível 25, deu **1,89× Fragmentos** e tornou o próximo nível **4,85× mais barato**. | Multiplicar o efeito do Rito por `1 + 1,5L/(L + 20)`, com a escala de custo do Tier I. Dá **1,83×** no nível 25 e se aproxima de **2,5×**. Mantém a exigência de Fênix. **26.000 Gnose.** |
| **Fogo Hermético** · 240.000 | Muda a base do Rito de Fervor de 2,18 para 2,35. No nível 130, a geração de Fervor passou a **4,03×**. | Multiplicar o efeito do Rito por `1 + 2L/(L + 50)`. Dá **2,44×** no nível 130 e se aproxima de **3×**. **30.000 Gnose.** |

## Tier IV · Apoteose

`E` é o estágio atual da Encarnação, de 1 a 5. `A` é o nível da Arca, de 0 a 4.

| Nó · custo atual | Impacto atual | Proposta · preço candidato |
| --- | --- | --- |
| **Gnosis Suprema** · 600.000 | Subtrai 0,05 da escala de todos os Ritos. Na compra observada, reduziu o próximo nível do Rito de Fervor em **50×** e o de Fé por Clique em cerca de **2.488×**. O Eclipse custa **100 mil vezes menos** (`10^25 → 10^20` Fé). O save já tinha atingido o Solar naquele ciclo, e o Eclipse barato reduz o custo de reconstrução na próxima Ascensão. | Cobrar **80% do preço de cada nível de Rito**, mantendo a escala. Descontar o Eclipse para **`10^24` Fé**. Isso preserva a função de facilitar a reconstrução e limita a vantagem a **10×** no Eclipse. **75.000 Gnose.** |
| **Fogo Empíreo** · 660.000 | Troca a base de produção de 2,35 para 2,65 e baixa a escala de preço do Rito de 1,70 para 1,60 com Gnosis Suprema. No save com Rito no nível 142, deu **10,49× Fervor/s** na hora e **127,30×** após cinco minutos com automação. O próximo nível ficou **5.479× mais barato**. | Multiplicar todo o Fervor/s por `1 + 0,15(E − 1)`: **1,15×** no Consagrado, **1,45×** no Eclipse e **1,60×** no Solar. A economia do Rito fica com Chama Astral e Gnosis Suprema. **95.000 Gnose.** |
| **Opus Perfeito** · 720.000 | Troca a base de Fragmentos de 3,40 para 3,75 e a escala de preço do Rito de 4,55 para 4,15 com Gnosis Suprema. No nível 44, rendeu **2,58× Fragmentos** de imediato e **4,65×** após cinco minutos. O próximo nível ficou **57,33× mais barato**. | Especializar na Arca. Multiplicar seu efeito em Fé/s por `1 + 0,25A` (**até 2×**), mantendo os Fragmentos como insumo do efeito original. Alquimia Hermética fica com a especialização em Transmutação. **115.000 Gnose.** |
| **Olho do Infinito** · 2.200.000 | Compra automaticamente Fiéis e Ritos sem gastar os respectivos recursos, desde que a compra caiba no saldo. Gera **+100% da Transmutação/s**, além dos 5% do Draupnir. No save, elevou a taxa de Fragmentos em **21×** na hora e **31,10×** após cinco minutos. A Fé/s ficou **6,34×** maior aos cinco minutos. | Cobrar o preço integral também nas compras automáticas. Com a geração ligada, somar **10% da Transmutação/s**, chegando a **15%** com Draupnir. No mesmo save, a taxa de Fragmentos ficou **3×** maior de imediato e a Fé/s ficou **1,36×** maior após cinco minutos. **200.000 Gnose.** |

## Cadência e ordem de adoção

1. Começar pelos efeitos de Coro Harmônico, Olho de Trismegisto, Gnosis Suprema, Fogo Empíreo e Olho do Infinito. Os maiores degraus combinam recursos, estágios e compras automáticas. Uma troca de fórmula limita essa multiplicação em níveis altos.
2. Aprovar preços junto com os efeitos. Mantendo todos os preços atuais, o pacote parou no limite de 16 h com **19 de 20 nós** na seed 786802. Isoladamente, baixar os preços também pode concentrar compras. Na variante com 75.000/95.000/115.000/350.000 para o Tier IV, os três primeiros ainda saíram na mesma Ascensão na seed principal e o tier ultrapassou **207 minutos** na seed 786803 com prioridade em automação.
3. Usar os preços da tabela como ponto de partida. A meta de 20–40 min ativos e 4–12 Ascensões por tier precisa de uma rodada própria, especialmente no Tier III. Acompanhar tempo até a primeira compra, maior intervalo entre compras permanentes, Gnose total no primeiro duelo de cada Guardião e tempo entre o primeiro e o último nó de cada tier. A prontidão de Hades, Odin e Caos Primordial depende da Gnose total, por isso ela pode virar o gargalo mesmo quando os nós ficam acessíveis.
4. Ao implementar, centralizar os novos preços usados no painel, no Máximo e na automação. Para saves atuais, preservar nós, níveis e Gnose total já ganhos e devolver uma vez as diferenças de preço conforme a migração econômica do jogo.

## Resultados de campanha

Tempo ativo por tier, arredondado ao minuto. Os três pares foram executados em presença contínua, com até 16 h simuladas. Os tempos de Tier IV incluem as compras necessárias para a invasão do Demiurgo.

| Seed · prioridade | Tier III atual → candidato | Tier IV atual → candidato | Campanha atual → candidata |
| --- | ---: | ---: | ---: |
| 786802 · produção | 52 → 77 min | 78 → 40 min | 8h14 → 8h01 |
| 786804 · produção | 51 → 75 min | 77 → 38 min | 8h34 → 8h20 |
| 786803 · automação | 70 → 98 min | 289 → 114 min | 15h21 → 12h54 |

O candidato da tabela concluiu as três campanhas. O Tier III desacelerou em todos os pares e ficou acima da meta. No IV, as duas execuções com prioridade em produção chegaram à meta de tempo, com duas Ascensões e alguns minutos entre os três primeiros nós e Olho do Infinito. Na prioridade em automação, o simulador esperou pelo Olho, comprou os quatro nós na mesma Ascensão e ultrapassou a meta de tempo.

Uma segunda faixa testada para o IV, **45.000/55.000/70.000/200.000**, levou 59–60 min de jogo ativo nas três execuções e concentrou as quatro compras na mesma Ascensão. Serve como referência para recalibrar os preços com outras políticas. No cenário casual testado por 24 h com essa faixa, a campanha chegou apenas a três nós do Tier I. Essa execução mede a dificuldade de chegar aos tiers avançados sob aquela política de jogo, sem fornecer uma comparação para o Tier IV.

## Como foi medido

- Base `cd43ca9`, versão 0.15.0, catálogo de 20 nós. Cada medição por nó parte de dois clones do save imediatamente anterior à compra na campanha ativa da seed 786802 com prioridade em produção. Um compra o nó e o outro serve de controle. As medições imediatas usam os saldos e níveis daquele instante. As de cinco minutos deixam o relógio, autocliques e automações já disponíveis rodarem, com o mesmo resultado de sorteio nos dois clones. Elas excluem decisões manuais e Ascensões. A retenção foi conferida pela fórmula de Ascensão e pelos níveis do mesmo snapshot.
- Cada multiplicador na proposta mede a compra isolada sob as regras propostas, usando os mesmos saldos e níveis da compra observada. As campanhas do pacote foram simuladas com `GameStateManager` e `ProgressionSimulator`, modo `visible` e passo padrão de 0,1 s. Os perfis de prioridade expressam decisões do simulador. Por exemplo, na seed 786802 ele priorizou compras de produção antes de Memória Hermética. A alteração de fórmulas foi carregada em memória para a análise.
- Os tempos por tier vão da abertura da Gnose/Anúbis até Hades, de Hades até Odin, de Odin até Caos Primordial, e de Caos Primordial até o Demiurgo. A invasão do Demiurgo começa depois da vitória sobre Caos Primordial e da compra dos 20 nós. As fontes de implementação são o [catálogo](../../src/config/gnose.ts), a [produção e automação](../../src/core/GameState.ts), as [fórmulas](../../src/systems/calculations.ts) e a [prontidão dos Guardiões](../../src/systems/bossCombat.ts).

Os detalhes por compra e por campanha ficam em `reports/gnose-impact-*.json`. Com o código da revisão 9 (`cd43ca9`), o script local `reports/gnose-node-impact-probe.mjs` reproduz os dois lados da seed principal e a comparação isolada a partir da raiz do repositório.

```bash
nix-shell --run 'node reports/gnose-node-impact-probe.mjs base active 786802 production 16'
nix-shell --run 'node reports/gnose-node-impact-probe.mjs matched active 786802 production 16'
nix-shell --run 'node reports/gnose-node-impact-probe.mjs price3 active 786802 production 16'
```

## Validação da revisão 10

A implementação concluiu **6 de 6** campanhas em presença contínua, seeds 786802–786804, com as políticas de produção e automação. A janela do Tier III foi de **75–79 min** em produção e **96–99 min** em automação. No Tier IV, foi de **38–40,4 min** e **109–114 min**, respectivamente. O Tier IV teve duas Ascensões por seed em produção e uma em automação. A cadência continua sensível à prioridade de compra.

A conferência manual passou pelas fórmulas, pelo preço de compras individuais e em lote, pelo pagamento das compras automáticas com Olho do Infinito, pelo interruptor de Auto-Transmutação e pela retenção na Ascensão. Um save da revisão 9 com os 20 nós recebeu **4.145.750 Gnose** de devolução no saldo, manteve sua Gnose total, seus nós e suas vitórias e recarregou sem nova devolução. O build passou.

```bash
nix-shell --run 'SCENARIOS=active,comfort node scripts/calibrate-progression.mjs reports/gnose-revision-10.json 3 final 16'
nix-shell --run 'npm run build'
```
