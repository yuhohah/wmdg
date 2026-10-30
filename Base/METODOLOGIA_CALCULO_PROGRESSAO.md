# Metodologia do benchmark de progressão por sessões

O benchmark compara políticas explícitas de interação com o `GameStateManager`. Os resultados são projeções de agentes simulados, não telemetria nem garantia de duração da campanha para humanos. A estratégia de compra é uma heurística de prioridades; não há prova de ótimo ou ROI máximo.

## Relógio e cenário

O cenário padrão mantém o jogo **aberto e visível** enquanto o jogador se ausenta. Produção e automações continuam; ações manuais param. Não representa aba oculta nem navegador fechado: o runtime pausa na ocultação e tem um caminho próprio de ganhos offline.

Todos os intervalos avançam pelo mesmo relógio: produção, reação, visita, ausência, Bênção, maldição, cooldown, combate e automações. `GameStateManager.tick` recebe passos de **no máximo 0,1 s**, próximos do runtime normal. Não se usam saltos de 5/50 s nem uma inversão da fórmula de Gnose para pular tempo. Passos menores podem ser escolhidos para testar convergência; o limite superior é validado.

Eventos são resolvidos com precisão de até um passo. As frações de cadência são preservadas em timestamps; a discretização não pode descartar `floor(CPS × dt)` a cada passo. Períodos ociosos não acumulam cliques para uma rajada futura.

A árvore vigente tem 8 nós no tier I (incluindo as três automações), 5 no II, 5 no III e 2 no IV. Os efeitos e a justificativa por nó estão em `Base/gnose-revisada-2026-10-27.md`. A primeira compra de Emanação concede a diferença até 1.000 Fé; as automações seguem o gasto e a reserva reais do domínio, com gratuidade somente após Olho do Infinito.

O horizonte padrão é **72 horas simuladas**, um limite computacional configurável. Atingir esse limite produz `status: time_limit`, `completed: false` e avaliação **Incompleto**. O tempo mostrado nesse caso é tempo observado, não tempo estimado até Tiamat. Há também `status: blocked` para o bloqueio confirmado de Fé após Ascensão sem cliques disponíveis; a causa aparece no relatório e não é contada como simples limite de duração.

## Combate e modo acelerado

O domínio também divide os intervalos em subpassos de até 0,1 s; o modo 100× processa os eventos intermediários. O dano final é limitado a 2,5% HP/s passivo, 0,6% HP por Pulso normal (dobrado em crítico) e 12% HP por Fenda. Pulsos respeitam cooldown de 0,2 s, inclusive fora do simulador. Cadência e janela das fendas variam por chefe. A defesa permite que um culto preparado vença sem intervenção manual. O benchmark mantém os mesmos perfis e usa essas regras reais; os resultados por chefe estão em `docs/boss-corrigido-2026-10-27.json`.

## Perfis

Os parâmetros completos estão em `src/benchmark/behavior.ts`. O perfil começa presente para permitir recrutar o primeiro fiel.

| Parâmetro | Ativo | Casual | AFK |
| --- | ---: | ---: | ---: |
| Clique inicial enquanto não há fiéis | 5/s | 2/s | 2/s antes de 10 min; após Gnose, só para recuperar o primeiro fiel |
| Clique rotineiro depois disso | 2/s | 1/s continuamente durante a sessão | 1/s antes de 10 min; zero depois |
| Clique na Esfera durante combate | 5/s | 3,5/s | 1/s antes de 10 min; zero depois |
| Orçamento máximo de interações | 5/s | 3,5/s | 2/s |
| Reação por decisão de compra/upgrade/prestígio/desafio | 3 s | 5 s | 2 s |
| Captura pretendida de pedidos visíveis | 95% | 40% | 0% |
| Latência de resposta ao pedido | 1 s | 3 s | — |
| Resposta à fenda | 0,3 s | 0,8 s | Nenhuma |
| Bênção manual | Tenta manter 60 s | Mantém até 6 s de carga durante a sessão | Tenta manter 60 s antes de 10 min; nenhuma ativação depois |
| Sessão inicial | Contínua | 8 min | Contínua |
| Duração das visitas seguintes | — | 8 min | — |
| Ausência após visita | — | 12 min fixos | Nenhuma: compras/prestígios continuam |

O Casual inicia sessões a cada 20 minutos (0, 20, 40… min), com 8 minutos completos de presença e 12 minutos de ausência. Durante a sessão, clica continuamente, mantém o 2× e realiza compras, prestígios e combates respeitando seu orçamento de interações e reação. A sessão inicial segue a mesma duração; concluir a campanha ou atingir o limite do relatório pode encerrar a medição antes do fim da sessão. Fora de combate, o recrutamento inicial sem fiéis usa sua cadência inicial de 2 cliques/s.

O AFK mantém compras, melhorias, confirmações e prestígios contínuos. Cliques rotineiros e de combate na Esfera e ativações **manuais** do 2× são proibidos a partir de 600 segundos de tempo total de campanha. Há uma exceção após Gnose: sem fiéis nem produção passiva, fora de combate, permite cliques a 2/s até o saldo alcançar o custo do primeiro fiel. A compra continua respeitando a reação de 2 s e o orçamento de interações. A janela inicial nunca reinicia após uma Ascensão. Carga de Bênção já acumulada pode expirar naturalmente, e Vigília Perpétua continua funcionando automaticamente. O AFK não coleta milagres nem clica nas fendas.

Os valores do Casual são hipóteses de comportamento ajustáveis; a definição temporal do AFK segue a instrução do projeto.

Todas as ações competem pelo mesmo orçamento manual: Esfera, Bênção, milagres, fendas, compras e confirmações. O custo é contado por interação sem cobrar navegação de câmera. Se a confirmação de Gnose estiver habilitada, abrir e confirmar o diálogo são duas interações separadas; a confirmação bloqueia cliques nos altares e pedidos até ser resolvida. A fila de decisão é revalidada ao executar. Um Rito ou uma Relíquia sobe **um nível por interação**. Apenas o botão Converter Máximo e as automações realmente existentes permitem lotes.

## Aleatoriedade

A seed padrão é `786802` (`0xc0172`). Geradores independentes e locais determinam ausências, calendário/captura dos milagres e críticos. O simulador não substitui nem consome `Math.random` global. A mesma seed e opções reproduzem o mesmo resultado de cada perfil; o timestamp do relatório apenas identifica a execução.

Cliques reais passam por `GameStateManager.addClick(random)`, que aplica a mesma probabilidade de crítico do jogo. O argumento é opcional; a aplicação continua usando `Math.random` por padrão. Conquistas são verificadas após ticks e ações, inclusive desde o primeiro clique. O primeiro fiel é comprado quando o saldo real permitir, sem fixar 20 cliques.

## Milagres

O calendário é uma referência em tempo real da arena a 60 FPS/velocidade normal: o primeiro cooldown é 5 s com fiéis, os seguintes são sorteados em 35–65 s, e o pedido dura 15 s. O cooldown seguinte só avança após captura ou expiração. A latência, as ausências e as demais ações podem impedir uma captura pretendida.

A recompensa vem da função compartilhada `calculateMiracleReward` usada pelo jogo:

`max(30, 15 × FéPorClique, floor(30 × FéPorSegundo + 0,1 × FéAtual))`.

A arena visual ainda usa contagem de frames para os pedidos. O benchmark declara a referência de 60 FPS e não tenta reproduzir variações de desempenho gráfico.

## Política de decisão

A cada oportunidade presente, a política considera, por ordem:

1. Retomar a produção quando não há fiéis e há saldo para recrutar.
2. Assimilar o nó de Gnose elegível de menor custo quando houver saldo, sem depender da ordem do catálogo.
3. Desafiar o primeiro guardião que `canChallengeBoss` permitir, sem exigir terminar o tier anterior. Durante maldição, aguarda recuperação.
4. Ascender quando `getGnoseToGet` já oferece o necessário para o próximo nó. O mínimo e o arredondamento vêm do domínio; não há constantes duplicadas da inversão.
5. Comprar o próximo Selo sequencial ou estágio da Encarnação acessível.
6. Restaurar uma Relíquia e comprar um nível de Rito acessível, priorizando o menor custo em Fervor.
7. Transmutar segundo uma regra declarada: ganho de pelo menos 15, primeira Transmutação ou ganho proporcional ao saldo sem geração percentual passiva.
8. Comprar fiéis quando isso não consome a reserva para um Selo/estágio próximo. O horizonte de reserva de 180 s usa a taxa atual apenas como heurística, sem avançar o relógio por essa previsão. Após Gnose, o limite de custo/taxa é 8 s.

A manutenção do 2× só repõe carga quando cabe uma pressão inteira de +2 s, sem pressionar repetidamente contra o limite. O Casual mantém até 6 s de carga durante toda a presença, independentemente de compras; não ativa a Bênção durante as ausências.

Fendas e pedidos de milagres prontos têm prioridade de interação; decisões vencidas vêm em seguida. Bênçãos e cliques aproveitam os demais espaços do orçamento. Uma mudança de prioridade pode cancelar uma decisão pendente; não é aplicada uma compra obsoleta sobre o estado novo.

## Conclusão e ritmo

Concluir exige Tiamat derrotada e todos os nós de Gnose assimilados. Não se presume intervalo obrigatório de 30 minutos por tier: essa antiga expectativa não era pré-requisito do jogo.

O instante do último clique na Esfera e da última ativação manual de Bênção é registrado por perfil e exibido no relatório.

São registrados dois tipos de espera entre mudanças de progressão (compra, desbloqueio, prestígio, estágio, vitória ou evolução automática):

- **Intervalo decorrido sem progresso:** inclui ausência programada, exibida separadamente no relatório.
- **Ociosidade enquanto presente:** exclui as ausências. Repetir consultas sem fazer uma ação não zera o contador. O trecho final também é contabilizado se a simulação terminar sem progresso.

Uma zona morta usa tempo **presente** acumulado acima de 5 min antes da Encarnação, 20 min até a Gnose e 2 h depois. Essa métrica mede falta de progressão no modelo; não mede satisfação ou fadiga de um jogador.

A avaliação é heurística e exige conclusão:

- **Incompleto:** horizonte atingido antes da conclusão ou bloqueio estrutural identificado. O campo `status` e a explicação distinguem os casos.
- **Gargalo Crítico:** mais de três zonas mortas ou ociosidade presente acima de 4 h.
- **Lento:** alguma zona morta ou ociosidade presente acima de 1 h.
- **Excelente:** sem esses problemas, ociosidade presente menor que 5 min e menos de 5 h de presença total.
- **Balanceado:** demais campanhas concluídas.

Esses limites de avaliação não alteram a simulação e não são evidência empírica de balanceamento.

## Execução

No ambiente do projeto:

```bash
nix-shell --run 'npm run benchmark'
nix-shell --run 'npm run benchmark -- --seed=42 --hours=72'
nix-shell --run 'npm run benchmark -- --seeds=1,2,3 --hours=24'
nix-shell --run 'npm run benchmark -- --json'
nix-shell --run 'node scripts/audit-benchmark.mjs'
```

`--seeds` mostra contagens de conclusão e min/mediana/max **apenas entre campanhas concluídas**. Execuções limitadas e bloqueadas são contadas separadamente e não entram como tempos de vitória. `--json` exporta todos os resultados e métricas para análise. A CLI e o painel usam o mesmo simulador.

O painel `[T]`/`[F2]` executa o benchmark num **Web Worker**, com progresso por perfil, para não bloquear a interface do jogo. A maior fidelidade numérica custa mais CPU que a versão anterior; o horizonte limita o trabalho.

## Validação

A suíte testa ausência de ações manuais fora das visitas, duração das sessões, relógio único, integração por subpassos, RNG isolado e reproduzível, críticos, cadência sem perda de frações, custos manuais dos Ritos, julgamentos AFK passivos, calendário dos milagres, esperas acumuladas, campanhas limitadas e conclusão real do Ativo.

Metas de duração de campanha e de intervalo entre chefes devem ser avaliadas separadamente. Não se ajusta a implementação nem o teste de correção para forçar as durações antigas de 3–4 horas.

## Recuperação após Gnose no AFK

Na primeira Ascensão sem Emanação Primordial, o ciclo começa com 1 Fé e zero fiéis. A compra de Emanação agora completa o saldo até 1.000 Fé imediatamente. A exceção de cliques de recuperação permanece para estados sem renda nem Fé para o primeiro recrutamento, respeitando as demais restrições do perfil. O simulador pode realizar um clique antes de a reação à compra de Emanação terminar; isso continua sendo uma ação permitida, contabilizada separadamente. A janela inicial de 10 minutos não reinicia, nem o 2× manual é reativado.

## Validação do Casual com sessões a cada 20 minutos

Na revisão de 27/10/2026, o Casual passou a jogar por 8 minutos desde o início de cada ciclo de 20 minutos, com 12 minutos de ausência. Os cliques rotineiros passaram a ser contínuos durante a presença e a Bênção é mantida até 6 s de carga. As demais cadências, prioridades e limites de interação do perfil foram preservados.

Na revisão anterior, com 20 nós, nas sementes **786802** e **42**, o Casual concluiu os **20 nós e 4 chefes** em aproximadamente **11h40**, com **4h41 de presença** e **36 sessões iniciadas**. A última sessão terminou com a conclusão da campanha. Os tempos iguais nessas duas execuções não garantem igualdade para outras sementes. A simulação mantém o jogo aberto e visível durante as ausências; não mede ganhos offline.

As regressões verificam saídas aos 480 e 1.680 segundos, retornos aos 1.200 e 2.400 segundos, atividade em todos os oito minutos de ambas as sessões e ausência de ações manuais fora delas. Os **67 testes**, a verificação TypeScript e a compilação de produção passaram.


## Revisão anterior da Gnose: 13 melhorias

A árvore tem 13 compras. Culto Autônomo reúne as três automações; seis buffs redundantes foram removidos. A migração de saves devolve compras removidas sem aumentar a Gnose vitalícia.

As melhorias ajustam parâmetros das fórmulas existentes em passos pequenos. Fiéis mantêm produção linear e ganham escala de custo menor; Ritos mantêm o mesmo expoente de nível e recebem bases de ganho melhores e escalas de custo menores. A Transmutação mantém o logaritmo e usa o Rito revisado. O ganho de Gnose mantém a potência de Fé/1Q, com expoente de 0,15 para 0,17. Os custos de Gnose das melhorias finais foram recalibrados para esses efeitos menores.

Os resultados da revisão anterior com multiplicadores fixos não descrevem esta revisão.

Validação desta revisão: semente **786802**, horizonte de 72 horas e integração de 0,1 s. active: completed, 9h46, 13/13 melhorias; casual: completed, 22h04, 13/13 melhorias; afk: completed, 47h27, 13/13 melhorias. Uma única semente não caracteriza a distribuição dos tempos nem garante esses resultados para jogadores.


## Expansão da Gnose: 17 melhorias

A distribuição atual é 5 / 4 / 4 / 4. Convergência dos Fiéis amplia a economia no tier II; Alquimia Hermética melhora o Rito de Fragmentos no III; Fogo Empíreo e Opus Perfeito continuam essas evoluções no IV. Os passos de ganho e redução de custo aumentam em cada linha, mantendo os expoentes de nível e as estruturas de cálculo. Fogo Hermético passa a usar base 2,35 para manter essa ordem de intensidade.

Validação com a semente **786802**, horizonte de 72 horas e integração de 0,1 s: active: completed, 11h48, 17/17 melhorias; casual: completed, 30h06, 17/17 melhorias; afk: time_limit, 72h00, 16/17 melhorias. Esses tempos são projeções de uma única semente, não garantias para jogadores.


## Combate e produção acumulada

O chefe final passa a ser **Caos Primordial**, mantendo a chave de persistência das vitórias anteriores. O simulador usa o histórico real de Fé, Fervor e Fragmentos gerados, além dos saldos, taxas de produção e upgrades. Esses totais persistem em Ascensões e não são reduzidos ao gastar recursos. Saves antigos usam os saldos conhecidos como limite inferior inicial; o histórico gasto anteriormente não é reconstruído por estimativa.

Reexecução com a semente **786802**, horizonte de 72 h e passo de 0,1 s: Ativo concluiu em **11h48**, Casual em **30h06**; AFK chegou ao limite com **16/17 melhorias**, sem concluir. O limite AFK é reportado como incompleto. Os resultados são projeções de uma única semente.
