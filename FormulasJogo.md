# Fórmulas atuais do jogo — A Entidade Divina

Referência das regras implementadas em **03/11/2026**. O [GDD](GDD.md) descreve o design; a [metodologia de progressão](docs/progression/README.md) explica como medir campanhas novas. Os valores abaixo descrevem o comportamento executado, inclusive limites e condições.

## Índice

1. [Convenções e estado inicial](#1-convenções-e-estado-inicial)
2. [Produção e cliques](#2-produção-e-cliques)
3. [Fiéis e custos](#3-fiéis-e-custos)
4. [Selos](#4-selos)
5. [Ritos de Fervor](#5-ritos-de-fervor)
6. [Encarnação e Bênção](#6-encarnação-e-bênção)
7. [Fragmentos, Transmutação e Relíquias](#7-fragmentos-transmutação-e-relíquias)
8. [Gnose e todos os upgrades](#8-gnose-e-todos-os-upgrades)
9. [Automações](#9-automações)
10. [Conquistas](#10-conquistas)
11. [Bosses e combate](#11-bosses-e-combate)
12. [Ascensão e persistência](#12-ascensão-e-persistência)
13. [Tempo, simulação e ganhos offline](#13-tempo-simulação-e-ganhos-offline)
14. [Apresentação e precisão](#14-apresentação-e-precisão)
15. [Migração de upgrades antigos](#15-migração-de-upgrades-antigos)
16. [Fontes e particularidades](#16-fontes-e-particularidades)

## 1. Convenções e estado inicial

Nas fórmulas, o ponto é o separador decimal, `^` significa potência, `floor(x)` arredonda para baixo, `ceil(x)` para cima e `clamp(x,a,b)=max(a,min(b,x))`. `log10` e `log2` usam bases 10 e 2. Um indicador `[condição]` vale 1 quando a condição é verdadeira e 0 no caso contrário. Produtos são multiplicações; percentuais escritos como `0.20` equivalem a 20%.

| Símbolo | Significado |
| --- | --- |
| `F`, `Fh` | Fé disponível e Fé total acumulada no histórico |
| `N` | Soma das quantidades de Fiéis atuais |
| `V`, `Vh` | Fervor disponível e Fervor total gerado |
| `Vp`, `Rp` | Maiores saldos de Fervor e Fragmentos da ascensão atual |
| `R`, `Rh` | Fragmentos disponíveis e total de Fragmentos gerados |
| `Rb` | Melhor quantidade recebida em uma Transmutação manual |
| `G`, `Gh` | Gnose disponível e Gnose total obtida por Ascensões |
| `S` | Estágio de Encarnação, de 1 a 5 |
| `L_id` | Nível atual do rito ou da relíquia indicada |
| `P`, `C`, `Q`, `W` | Fé/s, Fé por clique antes do crítico, Fervor/s e Fragmentos/s |
| `K`, `A` | Quantidade de upgrades de Gnose comprados e conquistas desbloqueadas |
| `dt` | Segundos simulados na atualização |

O jogo começa com `F=Fh=1`; cliques, Fiéis, Fervor, Fragmentos, históricos de Fervor/Fragmentos, Gnose, Ascensões e níveis de upgrades em zero. `S=1`, Bênção e cooldowns em zero. Selos fechados, nenhum boss derrotado, nenhuma conquista desbloqueada. As quatro opções de automação começam ativadas, mas só produzem efeito após seus upgrades.

## 2. Produção e cliques

### 2.1 Multiplicadores compartilhados

Somente conquistas já desbloqueadas entram nas somas:

```text
Ac = 1 + soma(buffVal das conquistas fpc_mult)
Ap = 1 + soma(buffVal das conquistas fps_mult)
Ag = 1 + soma(buffVal das conquistas global_mult)
D  = 1 - min(0.50, soma(buffVal das conquistas cost_discount))

MG = 1                                  se Gh <= 0
MG = 1 + 1.5 * Gh^0.35                   caso contrário

MR = 4^K                                K = número de nós assimilados
MN = MR                                 sem sinergia ou N <= 0
MN = MR * (1 + N^e)                      com Emanação ou Congregação
 e = 0.5 com Emanação; 1 com Congregação; 1.1 com Coro Harmônico

MB = produto(faithFervorMult dos bosses já derrotados)
MC = 0.75 enquanto bossCurseTimerSec > 0; 1 fora disso

RF = (1 + max(0,Vp)/1e18)^(2 * K / (K + 1))
BF = (2 * log10(max(0,Vp)/10 + 1) + 1) * efeito(fu_effect) * RF
I  = 1                                  se Vp <= 0 ou S <= 0
I  = 1 + log10(1 + max(0,Vp)/150) * 1.5 * max(1,S)  caso contrário

B = 2 se timer da Bênção > 0, ou se possui gn_bencao_eterna e Encarnação aberta
B = 1 caso contrário
```

Bônus da mesma categoria de conquistas **somam**; os fatores de categorias diferentes **multiplicam**. Gastar Gnose não reduz `MG`, pois ele usa `Gh`. Gastar Fervor ou Fragmentos não reduz `RF`, `BF`, `I` nem Arca: usam picos do ciclo (`Vp` e `Rp`), não históricos permanentes. Gastar Fé ainda altera a sinergia de Fé com Fervor.

### 2.2 Fé por clique e crítico

```text
C = max(1, Ac * Ag * MG * MN * MB * efeito(fu_click) * BF)
pCrit = 0 se cliques < 250; 0.05 se 250 <= cliques < 1000; 0.10 se cliques >= 1000
Fé recebida = C * (2 se random() < pCrit; 1 caso contrário)
F  += Fé recebida
Fh += Fé recebida
cliques += 1
```

O crítico é desbloqueado após completar 250 cliques, com 5% de chance de 2× Fé e dano por clique. Após completar 1.000 cliques, a chance aumenta para 10%, mantendo 2×. O novo patamar vale a partir do clique seguinte ao marco. O valor esperado por clique é `C`, `1.05*C` ou `1.10*C`, conforme o patamar. O progresso usa os cliques totais do save e permanece nas Ascensões. O clique não é arredondado para inteiro. A maldição, Bênção, Cornucópia e Arca não são fatores diretos de `C`. No combate, primeiro a Fé e o contador são creditados; depois o dano é calculado com o estado atualizado.

### 2.3 Fé por segundo

```text
baseFiéis = soma(quantidade_i * baseEffect_i) = N no catálogo atual
Cornucopia = 1 + 0.20 * L_relic_cornucopia
Arca = 1 se L_relic_ark <= 0
Arca = (log10(max(0,Rp)+1)+1)^(1.2*L_relic_ark) caso contrário

P = baseFiéis * efeito(fu_followers) * I * Ap * Ag * MG * MN * MB * MC
    * BF * Cornucopia * Arca * B
```

Sem Fiéis, `P=0`. Não há arredondamento da produção. O bônus de Encarnação `I` e o bônus `BF` são fatores separados e ambos dependem de Fervor.

### 2.4 Fervor por segundo

```text
Q = 0 se o Selo da Encarnação estiver fechado
Q = 1 * efeito(fu_prod) * (1 + 0.20*L_relic_torch) * multiplicadorDoAvatar
    * MG * MR * MB * MC * efeito(fu_synergy) * Phoenix
Phoenix = 1.5 se L_relic_phoenix >= 1; 1 caso contrário
```

A base é 1 Fervor/s. O Selo do Fervor abre os ritos; a produção de Fervor começa com o Selo da Encarnação. Conquistas de Fé, sinergia de Gnose dos Fiéis e Bênção não multiplicam diretamente `Q`.

### 2.5 Milagres dos Fiéis

```text
recompensa = max(30, 15*C, floor(30*P))
```

A recompensa credita Fé disponível e histórica. O termo `15*C` pode ser fracionário. Não realiza o sorteio de crítico do clique na Esfera nem conta como esse clique.

A arena desenha no máximo 35 Fiéis, sem limitar a produção. Os pedidos usam tempo transcorrido, independente de FPS: 5 s iniciais, 15 s de duração e intervalo aleatório de 35–65 s sem pedido ativo. Não há coleta automática durante ausência.

## 3. Fiéis e custos

Existe um tipo: **Fiel Devoto**, ID `f_devotee`, custo base 20 Fé, escala original 1.10, produção base 1 Fé/s por unidade.

```text
escala = max(1.05, 1.10 - 0.005*L_relic_caduceus
             - 0.01*[gn_init_faith] - 0.015*[gn_followers_economy])
custo(N) = max(1, floor(floor(20 * escala^N) * D))
```

Os dois `floor` são aplicados nessa ordem; não equivalem sempre a arredondar uma vez. Comprar 1 desconta esse custo e acrescenta 1 Fiel.

**Converter Máximo:** disponível com `N>=25` ou `gn_memoria_selos`. Calcula os custos individualmente, aumentando `N` temporariamente a cada compra e descontando de um saldo temporário. Para quando o próximo custo não cabe, não é finito ou chega a 10.000 compras por ação. Soma esses custos; não usa uma aproximação por série geométrica. O desconto de conquista usado no lote é o disponível no início do cálculo.

O ganho mostrado ao comprar `n` Fiéis é `P(estado com N+n) - P(estado atual)`, mantendo os demais saldos e bônus. Portanto inclui a mudança nas sinergias dependentes da quantidade, e não somente `n` vezes a produção anterior de um Fiel.

**Hermes versus Emanação:** cada nível de Hermes tira 0.005 da escala; Emanação tira 0.01, equivalente a dois níveis de Hermes nesse parâmetro. Hermes no nível 5 tira 0.025; combinado com Emanação dá escala 1.065; com Convergência também, chega ao piso 1.05. O texto “5% mais devagar por nível” do Cajado não é um desconto linear de 5% no preço: a fórmula executada é a redução de 0.005 da base exponencial.

## 4. Selos

Todos exigem **Fé** e são desbloqueios únicos por ciclo, exceto os selos preservados pela Gnose.

| Selo / ID | Limiar / custo em Fé | Pré-requisito na interface/automação | Efeito |
| --- | --- | --- | --- |
| Selo da Encarnação (`unlock_incarnation`) | 200 | Nenhum | Rompe o selo que impede você de ter um corpo. Acende o Fervor (+1/s) e abre a aba Encarnação. |
| Selo do Fervor (`unlock_fervor_upgrades`) | 5000 | unlock_incarnation | Libera os Ritos de Fervor: gaste Fervor em melhorias permanentes para cliques, fiéis e para o próprio Fervor. |
| Selo das Relíquias (`unlock_relics`) | 20000000 | unlock_fervor_upgrades | Libera a Transmutação: troque toda a sua Fé por Fragmentos e use-os para restaurar relíquias de deuses caídos. Abre a aba Relíquias. |
| Selo da Gnose (`unlock_gnose`) | 1e15 (limiar sem cobrança) | unlock_relics | Libera a Ascensão Gnóstica: dissolva seu culto terreno a partir de 1Q de Fé para colher Gnose e desbloquear a Árvore Hermética permanente. Abre a Câmara da Gnose. |

Romper o Selo da Gnose exige atingir `1e15` Fé, mas **não consome** o saldo, permitindo realizar a primeira Ascensão imediatamente com esse mesmo saldo. O acesso à Gnose permanece quando o selo está aberto **ou** existe ao menos uma Ascensão **ou** `Gh>0`.

## 5. Ritos de Fervor

Todos começam no nível zero, usam **Fervor** e não têm nível máximo fixo. O custo é o do **próximo** nível, usando o nível atual `L`:

```text
custo = floor(custoBase * escalaEfetiva^L)
escalaEfetiva = max(1.01, escalaOriginal - reduções aplicáveis)
```

| Rito / ID | Custo base | Escala original | Multiplicador no nível L > 0 |
| --- | --- | --- | --- |
| Aumentar Produção de Fervor / `fu_prod` | 50 | 1.80 | `baseProd^(L^0.6)` |
| Aumentar Efeito do Fervor / `fu_effect` | 100 | 2.00 | `1.25^(L^0.8)` |
| Aumentar Fé por Clique / `fu_click` | 100 | 1.40 | `1 + 4*L^2.6` |
| Fiéis Aumentam Fé/s / `fu_followers` | 500 | 1.50 | `1 + L^1.5*N/50` |
| Fé Aumenta Fervor/s / `fu_synergy` | 500 | 2.50 | `1 + L^1.5*log10(max(0,F)+1)/5` |
| Aumentar Ganho de Fragmentos / `fu_relics` | 20000000 | 5.00 | `baseFrag^(L^0.6)` |

No nível `L<=0`, todos retornam multiplicador 1. Comprar aumenta o nível em 1 e desconta o custo. O Rito de Fragmentos exige a Pena Solar de Fênix para compra manual e automática.

```text
baseProd = 2.65 com gn_empyrean_fire
           2.35 com gn_fu1_boost, sem o anterior
           2.05 com gn_init_fervor, sem os anteriores
           2 caso contrário

baseFrag = 3.75 com gn_perfect_opus
           3.40 com gn_relic_refinement, sem o anterior
           3.05 com gn_relic_gain, sem os anteriores
           3 caso contrário

escala_fu_prod = max(1.01, 1.80 - 0.05*[gn_init_fervor]
                    - 0.10*[gn_empyrean_fire] - 0.05*[gn_apotheosis])
escala_fu_relics = max(1.01, 5 - 0.10*[gn_relic_gain]
                      - 0.30*[gn_relic_refinement] - 0.40*[gn_perfect_opus]
                      - 0.05*[gn_apotheosis])
escala_demais = max(1.01, escalaOriginal - 0.05*[gn_apotheosis])
```

As bases de produção **substituem** as anteriores; as reduções das escalas de custo **somam**. Com todos os upgrades: escalas dos seis ritos, na ordem da tabela, são `1.60`, `1.95`, `1.35`, `1.45`, `2.45`, `4.15`.

## 6. Encarnação e Bênção

A evolução compra somente o próximo estágio, descontando Fé. O multiplicador abaixo substitui o anterior; não multiplica cumulativamente os estágios.

| Estágio | Avatar | Custo normal em Fé | Com Gnosis Suprema | Multiplicador de Fervor/s |
| --- | --- | --- | --- | --- |
| 1 | Avatar Neófito | 0; inicial ao abrir o selo | 0 | 1 |
| 2 | Avatar Consagrado | 2.5e6 | 2.5e6 | 100 |
| 3 | Avatar Ancestral | 2.5e11 | 2.5e11 | 10000 |
| 4 | Avatar do Eclipse | 1e25 | 1e20 | 1e8 |
| 5 | Avatar Solar | 1e30 | 1e30 | 1e15 |

O estágio também entra no multiplicador `I` da produção dos Fiéis e na preparação/dano/defesa de combate.

**Bênção:** cada acionamento normal acrescenta 10 segundos: `timer=min(60,timer+10)`. Enquanto ativa, multiplica apenas a Fé/s por 2. Sem Vigília Perpétua, o timer cai em `dt`, até zero. Com Vigília e Encarnação aberta, é mantido em 60 segundos. Barra: `clamp(timer/60*100,0,100)`; segundos mostrados: `ceil(timer)`.

## 7. Fragmentos, Transmutação e Relíquias

### 7.1 Transmutação manual

```text
T = 0 se F <= 0
T = max(0, floor(log2(max(0,F)+1) * efeito(fu_relics))) caso contrário
```

Exige Relíquias abertas, cooldown de Transmutação em zero e `T>0`. Recebe `T` Fragmentos, soma `T` ao histórico `Rh`, atualiza `Rb=max(Rb,T)`, zera toda a Fé e inicia cooldown de **3 segundos**. Não zera Fiéis, Fervor, ritos ou avatares. É `Rb` que registra a melhor Transmutação **manual**, não as gerações automáticas.

### 7.2 Fragmentos por segundo

```text
W = 0 se o Selo das Relíquias estiver fechado
W = MR * (max(1,floor(Rb/10))
    + T * (0.05*[L_relic_draupnir >= 1]
           + 1*[gn_omniscience e autoRelicsEnabled])) caso contrário
```

Há pelo menos 1 Fragmento/s assim que Relíquias estão abertas, mesmo sem ter transmutado. Draupnir e Olho do Infinito somam: juntos geram `1.05*T` por segundo, além da base. Não gastam Fé e não acionam o cooldown manual. Não atualizam `Rb`. A geração por segundo aceita frações de Fragmento. Ressonância MR multiplica diretamente `W`. Bosses e maldição não são multiplicadores diretos de `W`; podem mudar `T` indiretamente pela Fé produzida.

### 7.3 Todas as Relíquias

Comprar exige saldo e nível abaixo do máximo; desconta o custo e aumenta 1 nível. Cornucópia e Tocha mantêm o preço inicial nos primeiros 20 níveis e crescem 15% por nível adicional. As demais Relíquias têm custos fixos por nível.

| Relíquia / ID | Custo por nível | Máximo | Efeito executado |
| --- | --- | --- | --- |
| Cornucópia de Amalteia / `relic_cornucopia` | `200 × 1.15^max(0,L−19)` | 20; ilimitado com Cripta | Fé/s × `(1+0.20*L)` |
| Tocha de Prometeu / `relic_torch` | `500 × 1.15^max(0,L−19)` | 20; ilimitado com Cripta | Fervor/s × `(1+0.20*L)` |
| Pena Solar de Fênix / `relic_phoenix` | 750 | 1 | Fervor/s × 1.5; libera comprar `fu_relics` |
| Cajado de Hermes / `relic_caduceus` | 1500 | 5 | Escala de custo dos Fiéis −0.005 por nível, respeitando piso 1.05 |
| Anel Divino de Draupnir / `relic_draupnir` | 2000 | 1 | Acrescenta `0.05*T` Fragmentos/s sem gastar Fé |
| Arca da Aliança Cósmica / `relic_ark` | 15000 | 4 | Fé/s × `(log10(max(0,Rp)+1)+1)^(1.2*L)`; nível 0: 1× |

Com Cripta Eterna, Cornucópia e Tocha deixam de ter limite de níveis; os primeiros 20 níveis custam 200 e 500 Fragmentos, respectivamente. Para comprar o próximo nível a partir do nível atual `L`, cobra-se `base × 1.15^max(0,L−19)`, sem arredondar a cobrança. Após o nível 20, cada compra fica 15% mais cara. Uma sequência de `n` compras com custo inicial `C` soma `C × (1.15^n − 1) / 0.15`; quando a compra cruza o nível 20, somam-se separadamente o trecho fixo e o trecho geométrico. Seus efeitos continuam lineares: `1 + 0,2 × nível`. As demais Relíquias mantêm seus limites. Restaurar Máximo calcula a quantidade e cobra o total diretamente, sem percorrer cada nível. A Oficina compra até 50 níveis por Relíquia por ciclo de um segundo, mesmo com níveis ilimitados. Todos os níveis restaurados permanecem após Ascensão e recarga do save.

A coleção nos limites originais soma 51 níveis e custa 84250 Fragmentos no total, antes dos níveis adicionais da Cripta. A Arca usa `Rp`: gastar Fragmentos não reduz o bônus.

## 8. Gnose e todos os upgrades

### 8.1 Ascensão e bônus permanente

```text
eAsc = 0.28 com gn_gnose_mult; 0.25 caso contrário
GanhoAscensão = 0 se Gnose inacessível ou F < 1e15
GanhoAscensão = max(1,floor((F/1e15)^eAsc)) caso contrário

G  += GanhoAscensão
Gh += GanhoAscensão
Ascensões += 1
MG = 1 + 1.5*Gh^0.35 para Gh>0; 1 para Gh<=0
```

Uma Ascensão com `F=1e15` dá 1 Gnose nos dois expoentes. Gastar Gnose em upgrades reduz `G`, preservando `Gh` e seu bônus. Ascender é bloqueado durante batalha ativa.

### 8.2 Catálogo completo dos 20 upgrades

Cada upgrade é comprado uma única vez e fica permanente. Exige tier aberto, saldo de Gnose e **todos** os pré-requisitos. Os nós aparecem por tier e custo crescente, com os pré-requisitos antes dos dependentes. A revisão 2 reduz os custos iniciais e intermediários, especialmente das automações, sem alterar efeitos ou bloqueios de tier. Saves da revisão 1 recebem uma única devolução da diferença dos nós já comprados; a Gnose total acumulada permanece igual. Os custos são fixos e não escalam; acima de 1.000 Gnose, usam dois algarismos significativos para manter metas legíveis. O arredondamento vale para o preço cobrado, não apenas para sua exibição. Cada compra também multiplica Fé por clique, Fé/s, Fervor/s e Fragmentos/s por 4; essa ressonância compõe MR, além do efeito individual abaixo.

### Tier 1

| Upgrade / ID | Custo em Gnose | Pré-requisitos | Efeito completo |
| --- | --- | --- | --- |
| Emanação Primordial (`gn_init_faith`) | 1 | — | Reduz a escala de custo dos Fiéis em 0,01: de 1,10 para 1,09 antes do Cajado de Hermes. A fórmula continua custo base × escala^quantidade. Completa até 1.000 Fé na compra e em cada reinício. Concede sinergia de 1 + raiz quadrada dos Fiéis. |
| Memória Hermética (`gn_memoria_selos`) | 24 | gn_init_faith | Abre o Selo da Encarnação imediatamente e o preserva nos reinícios de Gnose. Converter Máximo, Ritualizar Máximo e Restaurar Máximo ficam disponíveis. Os Selos de Fervor e Relíquias continuam sendo comprados com Fé. |
| Culto Autônomo (`gn_automation`) | 300 | gn_memoria_selos | Investe em Fiéis quando isso antecipa o objetivo escolhido; reserva Fé nos últimos 180 segundos. Paga os custos normais. Pode ser ativado ou desativado para guardar Fé. |
| Ruptura Automática (`gn_seal_automation`) | 4000 | gn_memoria_selos | Compra automaticamente todos os Selos ainda fechados, na ordem de seus pré-requisitos, pagando os custos normais com Fé. O Selo da Gnose exige apenas atingir o limiar. Repete as compras necessárias após cada Ascensão. Não preserva Selos abertos. |
| Chama Astral (`gn_init_fervor`) | 60000 | gn_init_faith | No Rito de produção de Fervor, a base de ganho passa de 2 para 2,05 e a escala de custo de 1,80 para 1,75. O expoente nível^0,6 continua igual. |
| Alquimia Astral (`gn_relic_gain`) | 1e8 | gn_init_faith | No Rito de Fragmentos, a base de ganho passa de 3 para 3,05 e a escala de custo de 5 para 4,90. Mantém nível^0,6 e a fórmula original da Transmutação. Exige a Fênix para usar esse Rito. |

### Tier 2

| Upgrade / ID | Custo em Gnose | Pré-requisitos | Efeito completo |
| --- | --- | --- | --- |
| Liturgia Autônoma (`gn_ritual_automation`) | 800000 | gn_seal_automation, gn_init_fervor | Compara o efeito relativo por custo dos Ritos de Fervor a cada segundo, usando até 100% do saldo atual de Fervor. Respeita a exigência da Fênix e o limite de 50 níveis por Rito por segundo. Possui ativar/desativar próprio. |
| Oficina Autônoma (`gn_relic_automation`) | 1e7 | gn_seal_automation | Prioriza a primeira Fênix e depois compara o retorno por Fragmento das Relíquias acessíveis, usando até 100% do saldo de Fragmentos e respeitando o nível máximo de cada Relíquia e até 50 níveis por Relíquia por segundo. Possui ativar/desativar próprio. |
| Cripta Eterna (`gn_keep_relics`) | 1e9 | gn_memoria_selos, gn_init_fervor | Preserva todos os níveis das Relíquias restauradas nos reinícios de Gnose e remove o limite de níveis da Cornucópia de Amalteia e da Tocha de Prometeu. |
| Congregação Esférica (`gn_followers_syn`) | 1e10 | gn_memoria_selos | O total de Fiéis amplifica toda a Fé: 1 + Fiéis. A Emanação Primordial já concede 1 + raiz quadrada dos Fiéis. |
| Vigília Perpétua (`gn_bencao_eterna`) | 1e11 | gn_init_fervor | Mantém a Bênção de 2× Fé/s sempre ativa enquanto a Encarnação estiver desbloqueada. |
| Convergência dos Fiéis (`gn_followers_economy`) | 1e12 | gn_init_faith, gn_followers_syn | Reduz a escala de custo dos Fiéis em mais 0,015: de 1,09 para 1,075 antes do Cajado de Hermes. Este passo é maior que a redução de 0,01 da Emanação Primordial. A fórmula de custo permanece igual. |

### Tier 3

| Upgrade / ID | Custo em Gnose | Pré-requisitos | Efeito completo |
| --- | --- | --- | --- |
| Coro Harmônico (`gn_followers_cubic`) | 1e13 | gn_followers_syn | Melhora o expoente da sinergia dos Fiéis de 1 para 1,1. A fórmula continua 1 + Fiéis^expoente. |
| Olho de Trismegisto (`gn_gnose_mult`) | 1e14 | gn_bencao_eterna | A fórmula da Ascensão continua (Fé / 1Q)^expoente. Melhora apenas o expoente de 0,25 para 0,28; o requisito de 1Q continua igual. |
| Alquimia Hermética (`gn_relic_refinement`) | 8e16 | gn_relic_gain, gn_keep_relics | No Rito de Fragmentos, melhora a base de ganho de 3,05 para 3,40 e reduz a escala de custo de 4,90 para 4,60. Os passos de +0,35 no ganho e −0,30 no custo superam os da Alquimia Astral. Mantém nível^0,6 e exige a Fênix. |
| Fogo Hermético (`gn_fu1_boost`) | 2.8e18 | gn_keep_relics | Evolui a base de ganho do Rito de Fervor para 2,35, mantendo o mesmo expoente nível^0,6. Substitui a base 2,05 da Chama Astral. |

### Tier 4

| Upgrade / ID | Custo em Gnose | Pré-requisitos | Efeito completo |
| --- | --- | --- | --- |
| Olho do Infinito (`gn_omniscience`) | 2e20 | gn_gnose_mult, gn_automation | Fiéis e Ritos com as respectivas automações desbloqueadas deixam de consumir recursos, mas ainda exigem saldo para cada compra. Libera a geração automática de 100% da Transmutação por segundo. A Oficina Autônoma continua pagando os custos das Relíquias em Fragmentos. |
| Gnosis Suprema (`gn_apotheosis`) | 1.7e22 | gn_omniscience, gn_fu1_boost, gn_followers_cubic | Reduz em 0,05 a escala de custo de cada Rito, depois das melhorias específicas. A fórmula continua custo base × escala^nível. Reduz o custo do Avatar do Eclipse para 1e20 Fé. O Avatar Solar custa 1e30 Fé e não exige este nó. |
| Fogo Empíreo (`gn_empyrean_fire`) | 1.2e28 | gn_init_fervor, gn_fu1_boost, gn_apotheosis | No Rito de Fervor, evolui a base de ganho de 2,35 para 2,65 e reduz sua escala de custo em mais 0,10. Com Chama Astral e Gnosis Suprema, o custo passa de 1,70 para 1,60. O ganho de +0,30 mantém o passo de +0,30 do Fogo Hermético; mantém nível^0,6. |
| Opus Perfeito (`gn_perfect_opus`) | 9.8e31 | gn_relic_refinement, gn_apotheosis | No Rito de Fragmentos, evolui a base de ganho de 3,40 para 3,75 e reduz sua escala de custo em mais 0,40. Com Gnosis Suprema, o custo passa de 4,55 para 4,15. O passo de +0,35 no ganho mantém o da Alquimia Hermética e a redução de −0,40 no custo o supera. Mantém nível^0,6 e exige a Fênix. |

### 8.3 Particularidades dos upgrades

- Emanação, ao ser comprada, credita `max(0,1000-F)` de Fé e histórico. Não adiciona 1000 quando o saldo já é maior. Na Ascensão, define o saldo inicial em 1000, sem adicionar esse reinício ao histórico.
- Memória abre imediatamente apenas Encarnação, mantém Converter Máximo e libera lotes manuais de Ritos e Relíquias. Não conserva os outros selos.
- Ruptura Automática paga os três primeiros Selos e reconhece o limiar gratuito da Gnose; não torna os primeiros permanentes.
- Cripta preserva somente níveis das Relíquias; não conserva Fragmentos, melhor Transmutação, selos, ritos ou estágio.
- Olho do Infinito deixa gratuitas apenas as compras **automáticas** de Fiéis e Ritos, se as respectivas automações estiverem compradas e ligadas. Compras manuais continuam pagas. Os três primeiros Selos e as Relíquias continuam pagos.
- Os nomes “Coro Harmônico”/ID `gn_followers_cubic` não indicam potência cúbica: o expoente atual é 1.1.
- Liberar tiers também exige os bosses: Tier 1 livre; Tier 2 Anúbis; Tier 3 Hades; Tier 4 Odin. Saves antigos com algum upgrade já comprado no tier conservam acesso a ele.

## 9. Automações

As compras automáticas executam a cada **1 segundo simulado**, com seu acumulador preservado no save:

1. Selos elegíveis são pagos antes de competir com Fiéis. Gnose exige o limiar mas não consome Fé.
2. Auto-Fiéis respeita o objetivo selecionado. Reserva quando faltam até 180 s pela produção atual para o objetivo ativo ou para um Selo/Avatar intermediário de menor custo na rota até um objetivo finito; fora dessa janela, compra uma unidade somente quando `(alvo - saldo + custo) / (P + ganhoDoFiel) < ETA atual` (ou livremente se não há objetivo finito elegível). Sem Fiéis, permite iniciar a economia. Até 10000 unidades por ciclo. Olho do Infinito dispensa o gasto, mantendo o limite do lote que caberia no saldo.
3. Auto-Ritos escolhe efeito relativo marginal por custo, com peso 0.15 para cliques e 1 para os demais efeitos, preservando recursos necessários a Selos em Fervor. Efeitos nulos são ignorados; Fênix continua obrigatória para o Rito de Fragmentos. Até 50 níveis por Rito por ciclo. Olho do Infinito dispensa o gasto, mas cada preço precisa caber.
4. Auto-Relíquias poupa para a primeira Fênix; depois compara ganhos relativos de Fé/s, Fervor/s, Fragmentos/s e economia de Fiéis por Fragmento. Continua pagando normalmente, respeitando os máximos.

O objetivo pode ser o próximo Selo, Avatar ou uma quantidade inteira de Gnose; no modo automático, escolhe o menor limiar elegível. A interface mostra objetivo e ETA pela produção atual, permitindo trocar ou pausar. Todos os interruptores e o objetivo persistem.

Memória permite compras manuais em lote: até 100 níveis de um Rito ou todos os níveis acessíveis de uma Relíquia, pagando cada custo normal. Compras individuais continuam disponíveis.

Auto-Transmutação soma `T*MR` Fragmentos/s com Olho do Infinito ativo. Draupnir soma `0.05*T*MR`, independentemente desse interruptor.

## 10. Conquistas

São permanentes depois de desbloqueadas. Requisitos de Fiéis e produção usam o estado atual; os de Fé e Gnose históricas usam os totais acumulados. A verificação usa um snapshot para todas as conquistas daquela chamada; novos bônus podem habilitar outra conquista numa verificação seguinte.

| Conquista / ID | Condição exata no snapshot | Bônus | Categoria / valor |
| --- | --- | --- | --- |
| Primeiro Contato (`ach_click_1`) | s.clicks >= 1 | +10% de Fé por clique | `fpc_mult` = 0.10 |
| Canalizador Incansável (`ach_click_50`) | s.clicks >= 50 | +20% de Fé por clique | `fpc_mult` = 0.20 |
| Cadência Devota (`ach_click_250`) | s.clicks >= 250 | +35% de Fé por clique; desbloqueia crítico 2× com 5% de chance | `fpc_mult` = 0.35 |
| Coração do Mundo (`ach_click_1000`) | s.clicks >= 1000 | +50% de Fé por clique; chance de crítico 2× sobe de 5% para 10% | `fpc_mult` = 0.50 |
| Primeiro Converso (`ach_f_1`) | s.followers >= 1 | +5% Fé/s dos fiéis | `fps_mult` = 0.05 |
| Pequena Congregação (`ach_f_10`) | s.followers >= 10 | +10% Fé/s dos fiéis | `fps_mult` = 0.10 |
| Irmandade Oculta (`ach_f_25`) | s.followers >= 25 | -5% no Custo de Novos Fiéis | `cost_discount` = 0.05 |
| Círculo de Devoção (`ach_f_50`) | s.followers >= 50 | +20% Fé/s dos fiéis | `fps_mult` = 0.20 |
| Legião Fanática (`ach_f_100`) | s.followers >= 100 | +30% Fé/s dos fiéis | `fps_mult` = 0.30 |
| O Centro em Toda Parte (`ach_f_250`) | s.followers >= 250 | +50% Fé/s dos fiéis | `fps_mult` = 0.50 |
| Centelha Mística (`ach_faith_500`) | s.totalFaith >= 500 | +5% em toda a Fé | `global_mult` = 0.05 |
| Correnteza da Fé (`ach_faith_5000`) | s.totalFaith >= 5000 | +10% em toda a Fé | `global_mult` = 0.10 |
| Mar de Preces (`ach_faith_50k`) | s.totalFaith >= 50000 | +15% em toda a Fé | `global_mult` = 0.15 |
| Singularidade da Esfera (`ach_faith_500k`) | s.totalFaith >= 500000 | +25% em toda a Fé | `global_mult` = 0.25 |
| Apoteose Universal (`ach_faith_5m`) | s.totalFaith >= 5000000 | +50% em toda a Fé | `global_mult` = 0.50 |
| Torrente Perpétua (`ach_fps_100`) | s.fps >= 100 | +15% Fé/s dos fiéis | `fps_mult` = 0.15 |
| O Primeiro Ouroboros (`ach_gnose_first`) | (s.gnoseResets ?? 0) >= 1 | +25% em toda a Fé | `global_mult` = 0.25 |
| Adeptus Hermeticus (`ach_gnose_25`) | (s.totalGnoseEarned ?? 0) >= 25 | +50% Fé/s dos fiéis | `fps_mult` = 0.50 |
| Mente Incircunscrita (`ach_gnose_500`) | (s.totalGnoseEarned ?? 0) >= 500 | +100% em toda a Fé | `global_mult` = 1.00 |
| Crepúsculo dos Deuses (`ach_boss_tiamat`) | !!s.tiamatDefeated | +100% em toda a Fé | `global_mult` = 1.00 |

No snapshot: `clicks=totalClicks`, `followers=N`, `totalFaith=Fh`, `fps=P`, `totalGnoseEarned=Gh`, `gnoseResets=Ascensões` e `tiamatDefeated` indica a vitória contra Caos Primordial.

Com todas as conquistas: `Ac=2.15`, `Ap=2.80`, `Ag=4.30`, `D=0.95`. O teto genérico de desconto é 50%, mas o catálogo atual concede só 5%. A conquista do Caos soma +100% à categoria global, além do prêmio separado de 10× do boss.

Progresso de requisito numérico `x` até alvo `t`: `current=min(x,t)`, `target=t`, `percent=min(100,100*x/t)`. Para Caos, atual 0 ou 1 e percentual 0 ou 100. O progresso não é um bônus adicional.

## 11. Bosses e combate

As fórmulas são calculadas em `getBossCombatBreakdown`. `H` é o HP máximo do Guardião e `d` sua escala de dificuldade. Recursos são consultados durante a luta; os valores podem mudar com a produção e as compras.

### 11.1 Guardiões e metas

| Guardião / ID persistido | HP máximo H | d | Recompensa de Fé/Fervor |
| --- | --- | --- | --- |
| Anúbis / `boss_anubis` | 1e18 | 1 | ×1.5 e Tier II |
| Hades / `boss_cronos` | 5e28 | 1.6 | ×1.5 e Tier III |
| Odin / `boss_odin` | 1e38 | 2.3 | ×1.5 e Tier IV |
| Caos Primordial / `boss_tiamat` | 1e42 | 3.2 | ×10 e conquista final |

Os multiplicadores acumulam: ×33.75 com as quatro vitórias, afetando também Fé por clique. Anúbis exige acesso à Gnose e pelo menos três nós atuais assimilados (saldo de Gnose ou quantidade de Ascensões não substituem as compras); Hades exige Tier II e dois nós desse tier; Odin exige Tier III e dois nós desse tier; Caos exige todos os vinte nós. Uma luta ativa impede iniciar outra. Guardiões derrotados só podem ser enfrentados em revanche.

| Referencial req | Anúbis | Hades | Odin | Caos |
| --- | --- | --- | --- | --- |
| faithLog | 15 | 22 | 30 | 38 |
| followers | 120 | 240 | 400 | 600 |
| fervorLog | 7 | 11 | 15 | 20 |
| fervorLevels | 35 | 80 | 150 | 250 |
| relicsLog | 2.5 | 3.5 | 4.5 | 5.5 |
| relicLevels | 6 | 18 | 35 | 50 |
| incarnationStage | 2 | 3 | 4 | 5 |
| gnoseLog | 0 | 1.2 | 2.4 | 3.5 |
| gnoseNodes | 1 | 5 | 10 | 17 |

São referenciais de prontidão, não requisitos individuais para iniciar o desafio. A meta 17 de Caos não substitui o requisito de entrada de vinte nós.

### 11.2 Bônus dos recursos

`LU` soma os níveis dos Ritos; `LR` soma os níveis de Relíquias. `boost=1` com Bênção ativa, inclusive Vigília com Encarnação aberta, ou zero sem ela.

```text
f=log10(max(0,F)+1); fh=log10(max(F,Fh,0)+1)
p=log10(P) se P>1; 0 senão
v=log10(max(0,V)+1); vh=log10(max(V,Vh,0)+1)
q=log10(max(0,Q)+1)
Re=max(R,Rb); r=log10(max(0,Re)+1); rh=log10(max(Re,Rh,0)+1)
w=log10(W+1); Ge=max(G,Gh); g=log10(max(0,Ge)+1)

bf=(0.02*f+0.02*fh+0.05*p)/d
bn=(0.22*log10(N+1)+min(1.5,0.008*N))/d se N>0; 0 senão
bv=(0.08*v+0.04*vh+0.08*q+0.04*LU)/d
br=(0.15*r+0.10*rh+0.08*w+0.08*LR)/d
bs=(0.35*(S-1)+0.25*boost)/d
ba=0.025*A/d
bg=(0.22*g+0.08*K+0.015*A)/d
soma=bf+bn+bv+br+bs+bg+ba
multiplicadorDeRecursos=(1+soma)*MC
```

Históricos de Fé, Fervor e Fragmentos permanecem úteis depois de gastar saldos e ascender. Isso é separado dos picos econômicos do ciclo.

### 11.3 Prontidão e thresholds

```text
rf=min(2,max(f,fh)/max(1,req.faithLog))
rn=min(2,N/max(1,req.followers))
rv=min(2,0.5*vh/max(1,req.fervorLog)+0.5*LU/max(1,req.fervorLevels))
rr=min(2,0.5*rh/max(1,req.relicsLog)+0.5*LR/max(1,req.relicLevels))
rs=min(2,(S+0.5*boost)/max(1,req.incarnationStage))
rg=min(2,0.8+0.25*K+0.20*g) se req.gnoseNodes<=1 e req.gnoseLog<=0
rg=min(2,0.5*g/max(0.5,req.gnoseLog)+0.5*K/max(1,req.gnoseNodes)) senão

preparo=(rf*rn*rv*rr*rs*rg)^(1/6)
podeAtacar = preparo >= 0.60
podeResistir = preparo >= 0.80
m = min(1,preparo) se podeAtacar; 0 senão
fatorPreparo=0.45+0.55*preparo
```

A média geométrica vai de zero a dois; um pilar zerado zera a prontidão. Abaixo de 60%, todas as fontes de dano são bloqueadas, mesmo que a produção bruta seja enorme. Abaixo de 80%, golpes não aparados são letais e a pressão contínua provoca colapso rápido. Constantes: `BOSS_DAMAGE_READINESS_THRESHOLD` e `BOSS_DEFENSE_READINESS_THRESHOLD`, em `src/config/bosses.ts`.

### 11.4 Dano passivo, cliques, aparos e Fulgor

```text
poderPassivo=H*soma*0.00175*fatorPreparo*MC se há poder ativo; 0 senão
DPS=m*min(0.018*H,max(P,poderPassivo))
Dclique=m*correntes*min(0.0045*H,
  max(C,H*0.0014*(0.6+0.4*preparo)*(1+0.12*soma+0.08*bv+0.08*bs)))
DfendaBase=m*min(0.085*H,
  max(5*C,H*baseFenda*(0.8+0.2*preparo)*(1+0.06*soma+0.10*br+0.08*bg)))
multCombo=1+min(0.30,(comboNovo-1)*0.05)
Dfenda=min(0.085*H,DfendaBase*multCombo)
Dfulgor=H*m*min(0.14,max(0.06,0.08+0.02*min(2,preparo)))
```

Há poder ativo se existe produção, Fiéis, recursos/históricos, níveis, Gnose ou Avatar acima do inicial. `correntes=0.5` enquanto houver fenda de Hades; 1 nos demais casos.

O clique normal respeita cooldown de 0.2 s; o crítico desbloqueado aos 250 cliques (5%, aumentando para 10% aos 1.000) dobra o dano depois do limite, até 0.9% de H. Cliques no cooldown continuam concedendo Fé. Aparar acrescenta 25 pontos de carga e aumenta o combo; errar zera o combo. Cliques de combate acrescentam 8 pontos de carga. A carga é limitada a 100.

Fulgor exige carga 100, combate iniciado e prontidão de ataque. Causa dano e zera a carga; não cura. Sem prontidão não dispara nem consome a carga. Aparos também não curam.

O corvo de Odin recebe ×1.6 quando aparado com pelo menos 35% da janela restante, limitado a 12% de H, e adia a próxima onda em 1.4 s. O último selo orbital do Caos soma `max(1.5*Dfenda,0.065*H*min(1,preparo))` se puder atacar; abaixo do threshold esse bônus é zero.

### 11.5 Proteção e pressão contínua

```text
defesa=0.20*bf+0.25*bn+0.35*br+0.35*bs+0.15*bv+0.25*bg+0.25*ba
mitigacao=1/(1+1.85*defesa)
danoPorErro=max(pisoErro,danoErroOriginal*mitigacao) se podeResistir; 100 senão
penalidade=1+(0.8-preparo)*1.8 se preparo<0.8; 1 senão
bonusPreparado=1/(1+(preparo-0.9)*3.2) se preparo>=1; 1 senão
pressaoBase=pressaoOriginal*penalidade*bonusPreparado/(1+2.2*defesa+1.4*preparo)
pressao=max(0.06,pressaoBase) se podeResistir
pressao=max(25*(1+0.8-preparo),pressaoBase) caso contrário
```

| Parâmetro | Anúbis | Hades | Odin | Caos |
| --- | --- | --- | --- | --- |
| baseFenda | 0.040 | 0.038 | 0.036 | 0.035 |
| Intervalo base (s) | 3.6 | 3.3 | 3.0 | 2.7 |
| Janela base (s) | 2.2 | 2.0 | 1.8 | 1.65 |
| Dano original por erro | 32 | 36 | 40 | 46 |
| Piso de dano por erro | 3.2 | 4.2 | 5.5 | 7.5 |
| Pressão original/s | 0.65 | 0.95 | 1.25 | 1.65 |

O tick desconta `pressao*dt` da integridade. Com proteção suficiente, fendas de balanças/correntes usam metade do dano por erro; selos orbitais usam 40%. Sem proteção suficiente, qualquer erro tira 100, sem essa redução.

A integridade inicial é 100. O milagre da roda dura 1.5 s e cura `min(10,100-integridade)`. Surge periodicamente em intervalos de 10–14 s e é garantido nas transições de fase se não houver outro ativo. O campo legado `altarHealOnRift=min(16,4*bn+5*br+4*bs)` ainda é calculado, mas não concede cura ao aparar.

```text
estimativaVitoriaPassiva=H/DPS se DPS>0; infinito senão
perdaMedia=danoPorErro/(intervaloBase+0.35*janelaBase)
estimativaSobrevivencia=100/max(0.05,pressao+perdaMedia)
```

As estimativas são aproximações; não incluem a sequência de assinaturas, aparos, cura e ondas de fase.

### 11.6 Fases, preparação e resultado

Fase II em `HP/H<=0.60`; fase III em `HP/H<=0.25`. As transições causam 15 e 30 pontos de dano à Esfera, uma única vez cada; podem ser letais e somam 45 ao atravessar ambas. Fendas pendentes são dissipadas sem erro extra. O intervalo é multiplicado por 0.88 na fase II e 0.78 na III; a janela comum é `max(1.3,janelaBase*escala)`, com escala 0.92 e 0.85.

Na fase I as ondas são comuns. Nas fases II/III alternam ataques comuns e especiais: duas balanças de Anúbis, duas correntes de Hades, corvo de Odin e três selos orbitais de Caos. Balanças e correntes têm janela ×1.15; corvo usa `max(1.15,janelaComum*0.82)`; selos orbitais usam janela ×1.25.

Com `awaitProcession`, o combate fica suspenso até a procissão formar a roda e o Guardião chegar. Não há pressão, dano ou novas fendas antes de `beginBossCombat`. O HP inicial é H, integridade 100, combo/carga/cooldown zero e primeiro timer `0.65*intervaloBase`.

HP zero vence; integridade zero perde. Expiração de fendas e pressão são processadas antes do DPS. Vitória de campanha concede recompensa permanente e remove maldição; derrota aplica 20 s de −25% Fé/s e Fervor/s. Recuo não aplica maldição. Revanche não duplica recompensas nem aplica maldição; vitórias registram o melhor tempo, persistido no save.

## 12. Ascensão e persistência

| Estado | Após Ascensão |
| --- | --- |
| Fé atual | 1000 com Emanação; 1 sem ela |
| Fiéis | Todos zerados |
| Fervor e níveis dos ritos | Zerados |
| Avatar | Estágio 1 |
| Bênção | 60 s com Vigília + Memória; zero caso contrário |
| Fragmentos, melhor Transmutação, cooldown manual | Zerados |
| Picos Vp e Rp | Zerados, mesmo com Cripta |
| Níveis das Relíquias | Preservados com Cripta; zerados sem ela |
| Selo da Encarnação | Aberto com Memória; fechado sem ela |
| Selos do Fervor e das Relíquias | Fechados; automação precisa pagar novamente |
| Selo da Gnose | Aberto |
| Gnose disponível e histórica | Recebem o ganho da Ascensão |
| Upgrades de Gnose, bosses e conquistas | Preservados |
| Históricos de Fé, Fervor, Fragmentos e contador de cliques | Preservados |
| Interruptores de automação | Preservados |
| Maldição de boss | Não é apagada pela Ascensão |

Transmutar é uma operação diferente: só zera Fé e adiciona Fragmentos, atualizando recorde/cooldown. Compras gastam saldo, sem subtrair dos históricos. Reiniciar integralmente pelo reset de dados restaura os padrões iniciais.

## 13. Tempo, simulação e ganhos offline

### 13.1 Atualização normal

O loop padrão chama a simulação 10 vezes por segundo, intervalo nominal `floor(1000/10)=100 ms`:

```text
rawDt = clamp((agora-anterior)/1000,0.001,1)
velocidade = max(0,velocidadeConfigurada)
dt = rawDt*velocidade
```

Velocidade zero não chama os ticks. O estado rejeita `dt` negativo/não finito e divide o intervalo em passos de no máximo 0.1 s, enquanto resta mais que `1e-8` s. Isso preserva a sequência dos efeitos, inclusive com velocidade de teste aumentada.

Em cada subpasso:

1. Maldição diminui até zero; Vigília fixa Bênção em 60 se Encarnação aberta.
2. Calcula `P`; soma `P*dt` à Fé atual e histórica.
3. Calcula `Q` com a Fé já atualizada; soma `Q*dt` ao Fervor e histórico.
4. Reduz cooldown de Transmutação até zero.
5. Calcula `W` com os novos saldos; soma `W*dt` aos Fragmentos e histórico.
6. Sem Vigília, reduz Bênção até zero.
7. Atualiza batalha.
8. Soma `dt` ao acumulador da automação; ao chegar a 1 s, com tolerância `1e-8`, desconta 1 e executa o ciclo.

Portanto os recursos se realimentam em subpassos; projetar todos com taxas constantes por muito tempo não reproduz exatamente a simulação. Suspender atualizações de cards fora da tela ou modais fechados não suspende esses cálculos de produção e temporizadores.

### 13.2 Ganhos offline

Ao carregar um save, importar ou retornar à aba, o período positivo ainda não creditado é limitado a **24 horas** e reproduzido com `tick` em subpassos de 0.1 s. As conquistas também são verificadas por subpasso, como na referência online; produção, Bênção, maldição e automações evoluem durante todo o período. O combate é encerrado antes da reprodução e não recebe vitórias; não há cliques, coleta de milagres, compra manual de Avatares nem Ascensões.

O cursor avança até o momento atual, descartando o excesso acima de 24 h, e o estado creditado é salvo com esse timestamp. Eventos repetidos de retorno não aplicam o período novamente. Salvar enquanto a aba continua oculta preserva o timestamp anterior ao período ainda não creditado.

Não é uma aproximação de taxas constantes: usa o mesmo integrador e preserva a fração do ciclo de automação. Os testes comparam 1 min, 10 min, 1 h e 24 h com tolerância relativa de `1e-8`. A execução de períodos longos é síncrona; pode bloquear temporariamente a interface durante o carregamento.

## 14. Apresentação e precisão

O estado usa `number` do JavaScript (ponto flutuante IEEE 754 de 64 bits), não inteiros arbitrários. Valores podem ser fracionários; números acima de `2^53-1` perdem precisão inteira. Potências muito altas podem exceder o limite numérico. A formatação não muda o saldo armazenado.

`formatNumber`:

- Não finito ou NaN: texto `0`. Negativo: prefixa `-` e formata o módulo.
- A partir de `1e18`: mantissa de uma casa decimal e expoente decimal; se a mantissa arredondar para 10, divide por 10 e aumenta o expoente.
- Até esse limite: `K=1e3`, `M=1e6`, `B=1e9`, `T=1e12`, `Q=1e15`. Valor dividido pela unidade usa uma casa quando é pelo menos 100; duas abaixo de 100; remove zeros finais. Se arredondar para 1000, promove a unidade (1000Q vira `1.0e18`).
- Abaixo de 1000: fração estritamente entre 0 e 10 usa uma casa decimal; demais usam `floor`.

Títulos do culto pelo histórico `Fh`: `<1e3` Boato; `>=1e3` Seita; `>=1e6` Culto; `>=1e12` Igreja; `>=1e25` Credo Mundial; `>=1e50` Mente Única. Vencer Caos Primordial substitui esses títulos por Crepúsculo dos Deuses, independentemente da Fé histórica.

No combate: barra de HP `clamp(100*HP/H,0,100)`; altar usa `clamp(100*integridade/integridadeMaxima,0,100)`; preparação é `round(100*preparo)`; bônus em percentual usam `round(100*bonus)`; estimativa restante passiva usa `ceil(HP/DPS)` ou infinito. A previsão do próximo combo é `1+min(0.30,comboAtual*0.05)`; o rótulo de dano das fendas pode usar a base sem o combo.

## 15. Migração de upgrades antigos

Itens abaixo foram removidos do catálogo ativo; não aplicam seus antigos efeitos. Ao carregar saves, são removidos e migrados uma vez, preservando compatibilidade de tiers quando aplicável.

| ID removido | Reembolso em Gnose | Tier antigo |
| --- | --- | --- |
| gn_click_power | 3 | 1 |
| gn_dilatacao | 3 | 1 |
| gn_altar_resonance | 118 | 2 |
| gn_alchemical_mind | 150 | 2 |
| gn_synergy_boost | 8450 | 3 |
| gn_relic_resonance | 9900 | 3 |

Automações antigas `gn_auto_followers` (3), `gn_auto_fervor` (5) e `gn_auto_relics` (8) são reunidas em `gn_automation` (pelo custo atual do catálogo). Seja `pago` a soma dos itens antigos possuídos: se o novo já existe, reembolsa `pago`; caso contrário, concede o novo e reembolsa `max(0,pago-custoAtual)`.

Selos antigos `gn_fervor_seal` (4, Tier 1) e `gn_relics_seal` (12, Tier 2) são reunidos em `gn_seal_automation` (pelo custo atual do catálogo). Se o novo já existe, reembolsa `pago`; caso contrário, concede o novo e reembolsa `max(0,pago-custoAtual)`. A migração do antigo selo de Relíquias conserva acesso ao Tier 2 por compatibilidade.

Os reembolsos aumentam Gnose disponível, não Gnose histórica. IDs antigos são removidos, impedindo repetir o reembolso. Migrações de itens removidos de tiers posteriores preservam o acesso herdado por meio dos respectivos guardiões.

A revisão de progressão é marcada por `progressionRevision=1`. Para itens antigos cujo preço caiu, devolve `max(0,preçoAnterior-preçoAtual)` ao saldo, sem aumentar Gnose histórica; preços maiores não geram cobrança adicional. Saves sem picos iniciam Vp/Rp a partir dos saldos conhecidos, nunca de Vh/Rh. O marcador salvo impede repetir o reembolso.

## 16. Fontes e particularidades

Fontes principais desta referência:

- [Cálculos compartilhados](src/systems/calculations.ts): custos, produção, bônus, Transmutação, Gnose e formatação.
- [Estado e regras executadas](src/core/GameState.ts): composição dos multiplicadores, combate, compras, automações, Ascensão e migração.
- [Loop](src/core/GameLoop.ts) e [inicialização/offline](src/main.ts): tempo, pausa e ganhos offline.
- [Fiéis](src/config/followers.ts), [Selos](src/config/unlocks.ts), [Ritos](src/config/fervor.ts), [Encarnação](src/config/incarnation.ts), [Relíquias](src/config/relics.ts), [Gnose](src/config/gnose.ts), [Conquistas](src/config/achievements.ts), [Bosses](src/config/bosses.ts): catálogos e constantes.
- [Arena dos Fiéis](src/ui/followersArena.ts): pedidos de milagres e contadores de animação.
- [Estatísticas](src/features/stats/StatsTab.ts) e [modal de bosses](src/features/gnose/BossBattleModal.ts): indicadores exibidos.

Particularidades técnicas que afetam a interpretação:

1. Pré-requisitos dos Selos são respeitados pela interface e automação; `buyUnlock` isoladamente valida saldo, pré-requisito e se já está comprado, dispensando a cobrança apenas em `unlock_gnose`. Evolução do avatar e compra de `fu_relics` validam requisitos dentro do estado (`canAccessIncarnationStage`, `isPhoenixRelicUnlocked`).
2. A fórmula de efeito de um `fu_relics` já nivelado não testa novamente a Fênix; a exigência está na compra do nível.
3. Níveis de Relíquias preservados pela Cripta podem continuar afetando as fórmulas mesmo antes de reabrir o Selo das Relíquias. A geração `W` e sua automação de compras continuam exigindo o selo.
4. Ao carregar, saldos são limitados inferiormente a zero (histórico de Fé a pelo menos 1), Bênção a 0–60, estágio a 1–5 e níveis de Relíquias a 0–máximo. Sem Selo das Relíquias aberto, Fragmentos e recorde de Transmutação carregados são zerados. Batalha ativa não é retomada; contador de fendas reinicia e acumulador de automação é preservado em `[0, 1]`. Vigília fixa Bênção quando aplicável.
5. A documentação cobre regras da partida, bônus, custos, compras, combate, temporização e indicadores de progressão. Movimento decorativo, partículas, cores, áudio, CSS e estratégias do simulador de benchmark não concedem bônus e não constituem fórmulas econômicas da partida.

**Inventário conferido:** 1 tipo de Fiel, 4 Selos, 6 Ritos, 5 estágios de Encarnação, 6 Relíquias, 20 upgrades ativos de Gnose, 20 Conquistas e 4 Bosses; além de regras de migração de 11 IDs antigos.

### Coreografia e defesa na batalha

A câmera acompanha a Encarnação até a roda completa, depois segue o boss desde (180, 854), a 1560 unidades da Esfera. Dano e fendas começam apenas quando ele chega ao ponto de combate. Na luta, a câmera enquadra a arena completa. Aparar cancela a animação e seu impacto, concede 0,6 s de recuperação e impede que fendas já pendentes reiniciem imediatamente o golpe. Atualizações atrasadas de erro não disparam novas animações.
