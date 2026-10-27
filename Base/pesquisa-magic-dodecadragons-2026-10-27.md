# Pesquisa: Magic de DodecaDragons

Consulta: 2026-10-27. Escopo: somente fontes primárias do repositório `DemoninCG/DodecaDragons`; leitura estática do código e do HTML, sem executar uma partida. `main` consultado pela API apontava para **`0ed545495bc779077a41832b24b164e6d85eeaa1`**, commit de 2024-09-08T07:30:59Z ([commit fixado](https://github.com/DemoninCG/DodecaDragons/commit/0ed545495bc779077a41832b24b164e6d85eeaa1)). As referências abaixo são links permanentes dessa versão fixada; não presumem que a versão hospedada do jogo seja idêntica. Nenhuma implementação de Gnose foi analisada aqui.

## 1. Desbloqueio, reinício e bônus passivo

Desbloquear Magic **custa e subtrai `1e15` ouro**, abre Magic e suas melhorias e avança `unlocks` para 4. Logo, pagar o desbloqueio com exatamente esse saldo deixa zero ouro e não garante Magic no primeiro reinício. O reinício sem ganho é permitido, mediante confirmação. [Desbloqueio e confirmação][unlock]

No estágio MU1–MU20, antes de sigilos e Dark Magic, o ganho é:

```text
G = gold atual; M = Magic atual
A = 1, sem MU4
    1 + 1.5 × log2(M + 1), com MU4 sem MU10
    1 + 4 × log2(M + 1), com MU4 e MU10
ΔM = floor((G / 1e15)^0.1 × A
           × (1.5 se MU2) × (2 se MU7) × (3 se MU18))
```

Não é ganho por diferença em relação a um total anterior: `magicReset()` soma o `game.magicToGet` já calculado ao saldo. Ouro é **saldo atual**, não ouro vitalício. O cálculo é atualizado em `updateSmall()` a cada 150 ms; o reinício consome esse valor armazenado. [Fórmula efetiva][gain], [chamada do cálculo][effect], [cadência][smalltimer], [crédito no reset][reset]

Depois, `getMagicGain()` multiplica sucessivamente por `(cyanSigils+1)^2`, `(blueSigils+1)^3`, `(indigoSigils+1)^4`, `(violetSigils+1)^5`, `(pinkSigils+1)^6`, nos respectivos desbloqueios 10–14; aplica `^1.1` com DMU10 e `^(1+log10(uranium+1)/30)` com DMU2. Limita o ganho antes de arredondar: limite rígido `10^5.000.000`, aumentado com melhoria 9 de Tome para esse limite elevado a `1+5×blueFireUpgrade4^0.7`. O saldo também é limitado no reinício e no passo de simulação de geração. [Ganho e limite][gain], [saldo no reset][reset], [saldo no tick][passive]

O bônus passivo normal é **`E = 1 + 3 × M × 1.5^p`**, em que `p` é a quantidade de níveis comprados da melhoria de Platina 7. MU16 transforma em `E²`. Esse efeito multiplica **ouro/s e ouro/clique**, não fogo/s diretamente. Usa **Magic atual**, e não Magic total já recebido: comprar MU reduz o saldo e, consequentemente, esse bônus e o fator de MU4. [Efeito][effect], [ouro/s][goldsecond], [ouro/clique][goldclick]

Modificadores posteriores: melhoria 2 de Plutonium eleva E a `1+(100000×níveis)^0.8`; Hell camada ≥5 aplica `log10(E+1)`; A1 depois **substitui** E (ver seção 3). Em seguida há dois limites suaves sequenciais: se E>`10^1000`, `E←sqrt(E×10^1000)`; se o resultado >`10^100000`, `E←(E×10^900000)^0.1`. [Ordem executada][effect]

O reinício Magic zera ouro, mineiros (mas deixa 1 com conquista Gold IX), fogo e os seis níveis/custos de melhorias de Fogo; zera platina e melhor conversão. Normalmente apaga melhorias de Platina **exceto PU3 e PU7**; com conquista Magic V preserva todas. Não apaga estágio do dragão, desbloqueios, os próprios MU, pontuações/magifolds ou urânio nessa função. Portanto o texto HTML “reset all previous resources and upgrades” (“reiniciar todos os recursos e melhorias anteriores”) é uma simplificação. [Reset completo][reset], [texto do botão][resethtml]

## 2. As 20 melhorias de Magic

Nomenclatura MU1–MU20 corresponde a `buyMagicUpgrade(1..20)`; arrays usam índice zero. Todas as 20 compras são únicas, **subtraem Magic**, sem árvore de pré-requisitos no método responsável: ele verifica somente “não comprado” e saldo suficiente. Os requisitos de acesso normais são visibilidade/desbloqueio da interface. O Comprar máximo chama MU1 até MU20 em ordem, sem testar os requisitos de acesso de visibilidade; por isso a progressão exibida não é uma restrição universal do método responsável. [Compra e Buy Max][buy]

Custos conferidos no array executável; descrições abaixo são **paráfrases** do HTML. [Custos MU1–MU20][costs], [HTML MU1–MU12][htmlfirst], [HTML MU13–MU20][htmllast]

| MU | Custo (Magic) | Descrição HTML, resumida | Efeito executado / ressalva |
| --- | ---: | --- | --- |
| 1 | 2 | Ouro multiplica seu ganho | Multiplica ouro/s **e** ouro/clique por `1+log10(G+1)`. [s][goldsecond], [clique][goldclick] |
| 2 | 3 | +50% de ganho de Magic | Multiplica o ganho por `1.5`, antes do arredondamento para baixo e dos expoentes posteriores. [ganho][gain] |
| 3 | 8 | Ouro e fogo ×55,5 | Ouro/s, ouro/clique e fogo/s ×`55.5`. [s][goldsecond], [clique][goldclick], [fogo][fireformula] |
| 4 | 12 | Magic multiplica seu ganho | Fator `1+1.5×log2(M+1)` no ganho de Magic, usando saldo atual; MU10 troca 1.5 por 4. [ganho][gain] |
| 5 | 30 | Ouro multiplica fogo | Fogo/s ×`1+log2(G+1)` (não log10). [fogo][fireformula] |
| 6 | 100 | Mineiros aumentam ouro/s | Ouro/s ×`1+miners^1.5`; MU10 troca o expoente para 3. Não afeta ouro/clique. [ouro/s][goldsecond] |
| 7 | 300 | Dobra ganho de Magic | ×`2` no ganho, cumulativo com MU2 e MU18. [ganho][gain] |
| 8 | 1.500 | Nova melhoria de Platina, mantida no reinício Magic | Exibe PU7. Cada compra de PU7 custa `1e6` platina e amplifica a parcela `3M` do bônus em ×`1.5` por nível; limite normal 10, e PU7 é preservado no reinício. Não concede os níveis gratuitamente. [desbloqueio][buy], [PU7][pu7], [efeito][effect], [reinício][reset] |
| 9 | 4.000 | melhorias de Fogo 2 e 3 muito mais fortes | FU2 muda `1.25^(n2^0.8)` para `1.6^(n2^0.8)` no ouro/s; FU3 muda ouro/clique base de `1+4×n3^2.6` para `1+4×n3^12`. Não altera custos dos FU. DMU6 posteriormente substitui a base de FU2 por 5. [s][goldsecond], [clique][goldclick], [compra FU][firebuy] |
| 10 | 20.000 | Melhora MU4 e MU6 | MU4: coeficiente `1.5→4` sobre log2; MU6: expoente `1.5→3`. Só beneficia os respectivos MU se comprados. [ganho][gain], [ouro/s][goldsecond] |
| 11 | 100.000 | Mais 10 compras de PU7 | Limite exibido/Comprar máximo de PU7 `10→20`; reabilita seu botão se estava em 10. **Ressalva:** a compra unitária de PU7 testa `<20` mesmo sem MU11; o limite de 10 depende do botão desabilitado, enquanto Comprar máximo aplica o limite condicional corretamente. [MU11][buy], [compra PU7][pu7], [Buy Max PU7][pu7max] |
| 12 | 400.000 | Desbloqueia desafios de Magic | Abre painel de desafios e magifolds, exibe botão de mais MU e avança o desbloqueio para 5. Não concede pontuação inicial. [compra][buy], [estado inicial][state] |
| 13 | 1e8 | Dobra pontuação de desafios | ×`2` na pontuação antes do arredondamento para baixo, não dobra diretamente magifolds. [pontuação][score] |
| 14 | 3e8 | Fortalece a melhoria de Fogo 1 | Fogo/s base passa de `2^(n1^0.6)` a `3.5^(n1^0.7)`; não altera custo, não é simples multiplicador fixo. O índice `[13]` significa MU14 apesar do comentário em `fire.js` mencionar “13”. [produção][fireformula], [compra FU][firebuy] |
| 15 | 1.5e9 | Melhora efeito de B1 | Penalidade de fogo/s em B1 passa de `^0.1` para `^0.3`; só beneficia enquanto B1 está ativo. [produção][fireformula] |
| 16 | 3e9 | Eleva efeito de Magic ao quadrado | Eleva **todo `1+3M×1.5^p`** a 2, antes de Plutonium, Hell e limites suaves. A1 substitui esse resultado e ignora esse benefício. [efeito][effect] |
| 17 | 1e11 | Magifolds multiplicam pontuação | Fator executado **`(log10(F)+1)/3`**. O indicador “Currently” mostra **`log10(F)/3`**, omitindo `+1`. Em F=1 o fator real seria 1/3, embora o requisito de acesso normal de mais MU exija F≥150.000. [pontuação][score], [indicador][readout] |
| 18 | 4e12 | Triplica ganho de Magic “again” | ×`3` no ganho; junto de MU2 e MU7, ×`9` antes de MU4 e de modificadores posteriores. “Again” (“novamente”) não implica um multiplicador adicional oculto. [ganho][gain] |
| 19 | 1e13 | Efeito magifold de ^4 para ^6 | Ouro/s e ouro/clique recebem `F^6` em vez de `F^4`. Não aumenta F nem a pontuação diretamente. DMU4 depois substitui por `F^8`; melhoria Violeta 3 tem precedência sobre ambos. [s][goldsecond], [clique][goldclick] |
| 20 | 1e16 | Desbloqueia Uranium | Abre painel/recurso Uranium, botão de mais PU e avança o desbloqueio para 7. Não é mais um multiplicador de Magic nem automação. [compra][buy] |

Para revelar a segunda leva, `unlockMoreMagicUpgrades()` requer **F≥150.000** e **M≥2e8**, subtrai **2e8 Magic**, sem gastar F, e revela MU13–MU20 (`unlocks=6`). No HTML bruto MU20 não tem `display:none` inline, ao contrário de MU13–MU19; esse detalhe de apresentação não substitui o requisito de acesso do fluxo normal. [Desbloqueio][more], [HTML][htmllast]

## 3. Desafios e magifolds

MU12 abre quatro restrições combináveis. Pode selecionar 1–4, mas não alterar seleção durante uma tentativa. Entrar exige tempo de recarga de Dragon Time zerado, salvo conquista Cyan I. **Entrar e sair chamam `magicReset()` normal**, inclusive seu crédito de Magic; não são reinícios que obrigatoriamente concedem zero. Ao sair, salva apenas a maior pontuação no grupo correspondente à **quantidade** de desafios ativos; não existe registro separado para cada combinação específica. [Seleção, entrada e saída][challenges]

| Desafio | Texto da interface | Comportamento efetivo |
| --- | --- | --- |
| A1, Magic fail | Efeito Magic `^0.2`, depois `/1e25` | **Divergência:** atribui `E=M^0.2/1e15`, substituindo a fórmula normal, PU7 e MU16; não calcula `E_normal^0.2/1e25`. Limites suaves ainda vêm depois. [texto][challengetext], [execução][effect] |
| A2, Market crash | Ganhos de ouro e platina `^0.25` | Aplica `^0.25` a ouro/s, ouro/clique e platina de conversão, após seus multiplicadores; Hell pode modificar depois. [s][goldsecond], [clique][goldclick], [platina][platinum] |
| B1, Freezing | Fire `^0.1`, ou `^0.3` com MU15 | Confere no ramo normal da fórmula. melhorias de Void Magic 5/6 usam outros ramos e contornam essa penalidade na versão fixada. [texto][challengetext], [execução][fireformula] |
| B2, Awful alchemy | Efeito PU6 `/1e25`, ouro/clique sempre 20 | Divide a variável de PU6 por `1e25`; **também divide ouro/s incondicionalmente por `1e25`**, mesmo se PU6 não comprado. Ouro/clique é substituído por 20 após A2, mas Hell ainda pode mudar depois. Evitar resumir como simples divisão única se PU6 está ativo. [texto][challengetext], [ouro/s][goldsecond], [clique][goldclick], [PU6][platinum] |

Pontuação inicial `S=floor(log10((G+1)×(fire+1)) × (2 se MU13) × ((log10(F)+1)/3 se MU17))`. Não depende da quantidade de desafios por um expoente adicional: essa quantidade escolhe o grupo. Modificadores posteriores, na ordem do código: melhoria de Urânio 3 ×`2^níveis`; DMU7 ×2; sigilos cyan ×`(c+1)^2`, blue ×`(b+1)^3`, violet ×`(v+1)^5`; red/orange/yellow ×`10^(400√r)`, `10^(800√o)`, `10^(1600√y)`; pink ×`(p+1)^6`, depois `^1.5^sqrt(PinkUpgrade3)`; DMU1 `^1.3`; Holy Tetrahedron Upgrade 2 `^2`; Holy Octahedron Upgrade 6 `^100`; só então arredonda para baixo. [Fórmula completa][score]

Os quatro recordes começam em 0; **F=`(S1+1)(S2+1)(S3+1)(S4+1)`**, inicialmente 1. F dá ouro ×`F^4` (×`F^6` com MU19). Portanto há recompensa para melhorar os quatro grupos, com realimentação F→pontuação via MU17. Em Hell F é forçado a 1. [Estado][state], [consolidação][challenges], [aplicação][goldsecond]

Os recordes não são absolutamente permanentes: alimentar o dragão inicialmente os zera; Cyan II reduz a perda para raiz quadrada; Blue I elimina essa perda. Com **5 Blue Sigils (Blue II)**, `updateSmall()` atualiza **todos os quatro** recordes pela pontuação corrente mesmo fora de desafios e recalcula F; a pontuação exibido fora da tentativa é zerada só depois dessa atualização. [Alimentar][feed], [limiares/recompensas][milestones], [automação executada][scoreauto]

## 4. Marcos, automação e gratuidade: origens distintas

Conquistas são obtidas ao verificar o **saldo atual do recurso**, e ficam registrados em `unlockedAchievements`; não exigem gastar o recurso nem usam um total vitalício na checagem. [Verificação][achievementcheck]

A fileira Magic tem limiares **1, 5, 50, 1.000, 100.000, 1e8, 1e20, 1e100, 1e500, 1e10000, 1e50000, 1e1000000**. Recompensas funcionais explícitas dessa fileira: [Limiares][thresholds], [recompensas][milestones]

- **Magic I, saldo 1:** libera Comprar máximo de melhorias de Fogo; **Magic II, saldo 5:** libera Comprar todas de melhorias de Fogo. São conveniências manuais, não compradores automáticos. [UI executada][achievementui]
- **Magic V, saldo 100.000:** preserva todas as melhorias de Platina no reinício Magic, sem preservar o saldo platina. [Reinício][reset]
- **Magic VI, saldo 1e8:** descrição promete 1% do ganho potencial/s; execução adiciona `magicToGet/100` **por chamada** de `updateLarge`, agendada a cada **500 ms**, sem correção temporal nesse ramo. Em condições ideais equivale a aproximadamente **2%/s**, divergindo do texto. [Descrição][milestones], [passo de simulação][passive], [temporizador][largetimer]
- **Magic VIII, saldo 1e100:** descrição promete 100% potencial/s e execução usa `magicToGet/timeDivider`, com `timeDivider=max(1000/tempo_decorrido_ms,0.0001)`: aproximadamente **100%/s**. Substitui o ramo de 1%; não é somado a ele. [Passo de simulação][passive], [tempo][largetime]
- Magic III, IV, VII e IX–XII não têm recompensa própria na tabela `achievementRewards`; não confundir esses marcos com MU de mesmo número. [Tabela de recompensas][milestones]

Outras origens relevantes (não são MU1–MU20):

- **Gold V (1e20):** Comprar todas de Platina; **Gold IX (1e1000):** comprador automático de mineiros e 1 mineiro preservado; **Gold XI (1e10000):** Comprar máximo de Magic/Dark Magic. Comprar máximo de MU executa uma passagem ascendente, cobra custos normalmente e não configura comprador automático de MU. [Limiares][thresholds], [recompensas][milestones], [método][buy]
- **20 Cyan Sigils (Cyan III):** desbloqueia Compra automática de todas de Fogo; o ciclo de execução chama `fireMaxAll()` se o controle de ativação estiver ligado. **1 Cyan Sigil (Cyan I)** automatiza Dragon Time e remove seu bloqueio de entrada em desafios; **5 Cyan (Cyan II)** suaviza perda de pontuações ao alimentar. [Recompensas][milestones], [ciclo][largetime], [entrada][challenges]
- **1e7 Uranium (Uranium III):** libera Comprar todas de Uranium; **5e8 Uranium (Uranium IV):** concede conversão potencial de Uranium automaticamente, distinta do pequeno ganho basal do recurso. [Limiares][thresholds], [recompensas][milestones], [execução][uraniumauto]
- **1 Blue Sigil:** alimentar já não reduz pontuações. **5 Blue:** pontuação passiva nos quatro grupos e preservação das pontuações em reinício de sigilos. **20 Blue:** mantém todos PU em reinício de sigilos. **20 Pink:** mantém MU e DMU em reinício de sigilos. Essas recompensas posteriores não devem ser atribuídas a um MU de persistência. [Recompensas][milestones], [preservação MU][sigilreset]

**Gratuidade:** nenhum MU1–MU20 torna compras gratuitas; o método responsável sempre subtrai seu custo de Magic. As melhorias de Fogo têm uma regra global independente: compra unitária só subtrai fogo se o custo `<10^(1e9)`; Comprar máximo só subtrai se o custo total `<10^(1e9)`. Continuam calculando acessibilidade com o saldo. Além disso, botões unitários são desabilitados a partir desse teto na UI. Mineiros têm regra semelhante: unitário não subtrai se **saldo ouro** ≥`10^(1e9)`; Comprar máximo não subtrai se **custo total** ≥esse valor. São regras numéricas do sistema, não recompensas de MU. [Fogo unitário][firebuy], [Fogo: Comprar máximo][firemax], [botões FU][firebuttons], [mineiros][miners]

No reinício de sigilos inicial, há ainda persistência seletiva de MU2, MU5, MU8, MU12 e MU20; MU11 depende de Blue III para sobreviver, e Pink III preserva todas. Isso é separado da persistência integral dos MU no reinício Magic. [Método de reinício de sigilos][sigilreset]

## 5. Pontos para a comparação com Gnose

Conclusões do original, para orientar a comparação sem presumir equivalência com a implementação local:

1. **Reservar ou gastar moeda é uma escolha real:** bônus de produção e MU4 usam saldo atual. Usar total recebido em outro jogo remove esse custo de oportunidade. [Efeito][effect], [ganho][gain]
2. **São 20 compras heterogêneas, não 20 multiplicadores:** há trocas de base/expoente (MU9/10/14/16/19), desbloqueios de sistemas (MU8/12/20), interação com desafios (MU13/15/17) e amplificadores de reinício (MU2/4/7/18). [Tabela de HTML][htmlfirst], [continuação][htmllast], efeitos discriminados na seção 2.
3. **Persistência, automação e gratuidade pertencem a canais diferentes:** conquistas e sistemas posteriores entregam a maior parte da qualidade de vida; nenhum dos 20 MU é comprador automático ou regra de compra grátis. [Recompensas][milestones], [compra MU][buy], [fogo][firebuy]
4. **MU17 e MU19 formam realimentação via pontuação e magifolds**, cujo incentivo é melhorar quatro recordes por cardinalidade; não há chefes ou prêmio binário de conclusão nesses métodos responsáveis. [Desafios][challenges], [pontuação][score], [ouro][goldsecond]
5. **Não copiar só o texto da UI:** A1 difere em variável e divisor; MU17 omite `+1` no indicador; o marco “1%/s” roda nominalmente a ~2%/s; B2 possui divisão adicional no ouro/s. Tratar como peculiaridades/possíveis bugs observados, não como intenções comprovadas do autor. [A1][effect], [MU17][readout], [passo de simulação][passive], [B2][goldsecond]

Ressalvas de método: fórmulas em blocos comentados foram desconsideradas; `getMagicGain()` é a função chamada, não o cálculo antigo comentado em `script.js`. A análise cobre todos os MU e os modificadores diretamente ligados a ganho/efeito/pontuação, mas não pretende catalogar integralmente os sistemas posteriores de Dark/Void Magic, sigilos, Hell e poliedros. Ausência de testes de execução do jogo significa que efeitos da ordem dos temporizadores, precisão de Decimal e salvamentos antigos não foram validados em uma partida. [Chamada efetiva][effect], [implementação ativa de Fogo][firebuy]

## Fontes primárias fixadas

[unlock]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/magic.js#L1-L23
[reset]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/magic.js#L25-L76
[gain]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/magic.js#L211-L232
[buy]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/magic.js#L78-L105
[more]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/magic.js#L107-L117
[costs]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/constants.js#L10-L10
[htmlfirst]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/index.html#L272-L296
[htmllast]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/index.html#L297-L314
[resethtml]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/index.html#L254-L261
[goldsecond]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/script.js#L1313-L1352
[goldclick]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/script.js#L1354-L1378
[fireformula]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/script.js#L1386-L1411
[firebuttons]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/script.js#L1424-L1448
[platinum]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/script.js#L1449-L1475
[effect]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/script.js#L1493-L1511
[score]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/script.js#L1523-L1543
[scoreauto]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/script.js#L1544-L1571
[readout]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/script.js#L1574-L1576
[smalltimer]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/script.js#L2189-L2190
[passive]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/script.js#L2243-L2251
[largetime]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/script.js#L2192-L2233
[largetimer]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/script.js#L2358-L2360
[challengetext]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/magicChallenges.js#L8-L24
[challenges]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/magicChallenges.js#L31-L81
[state]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/script.js#L145-L165
[firebuy]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/fire.js#L58-L76
[firemax]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/fire.js#L137-L179
[pu7]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/alchemy.js#L65-L70
[pu7max]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/alchemy.js#L133-L140
[milestones]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/constants.js#L155-L186
[thresholds]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/constants.js#L103-L126
[achievementcheck]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/achievements.js#L216-L247
[achievementui]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/achievements.js#L253-L269
[feed]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/dragon.js#L145-L186
[sigilreset]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/sigils.js#L75-L92
[miners]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/gold.js#L5-L27

[uraniumauto]: https://github.com/DemoninCG/DodecaDragons/blob/0ed545495bc779077a41832b24b164e6d85eeaa1/scripts/script.js#L2272
