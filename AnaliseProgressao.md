# Análise da progressão e dos resets de Gnose

Análise de 29/10/2026 sobre `FormulasJogo.md` e o código local, incluindo alterações já presentes no workspace. Não foram alteradas fórmulas, custos ou regras do jogo.

**Conclusão: as fórmulas centrais são coerentes como operações matemáticas, mas os números atuais não garantem uma progressão confortável.** Há avanços expressivos, porém separados por reconstruções repetitivas e intervalos de horas. A estratégia pode trocar parte dessas esperas por milhares de resets. A conclusão depende de como se joga; não existe um tempo único de campanha determinado apenas pelas fórmulas.

## 1. O reset foi incluído na análise

Os experimentos chamam `GameStateManager.performGnoseReset()`: Fiéis, Fervor, níveis dos ritos, Fragmentos e Avatar voltam ao início. Relíquias também são perdidas até existir Cripta Eterna. Não projetei uma campanha mantendo os ritos da ascensão anterior.

Há uma diferença entre “só Gnose permanece”, interpretado literalmente, e a regra documentada/executada:

- Upgrades, saldo e histórico de Gnose permanecem.
- Conquistas, bosses derrotados e históricos dos outros recursos também permanecem.
- Cripta preserva níveis de relíquias; Memória preserva Encarnação. São exceções concedidas pelos próprios upgrades de Gnose.
- Acesso à Gnose permanece; Fervor e Relíquias precisam ter seus selos comprados novamente.

Considerei essas exceções explícitas. Se a intenção for apagar também conquistas e bosses, os resultados abaixo não representam essa outra regra; o código e a documentação precisam ser ajustados antes da calibração. Históricos permanentes também melhoram o combate após reset, mesmo quando os recursos atuais estão zerados.

## 2. Método e resultado observado

Executei o benchmark existente em passos de 0,1 s, horizonte de 72 horas e sementes **786802 e 42**. Ele compra o próximo upgrade de Gnose elegível de menor preço e normalmente espera obter o que falta para essa compra em uma ascensão. Não é uma estratégia ótima demonstrada.

| Perfil | Semente 786802 | Semente 42 | Resultado |
| --- | --- | --- | --- |
| Ativo, presença contínua | 32h51 | 32h59 | 20 upgrades, 4 bosses, 20 resets |
| Casual, 8 min presente a cada 20 min | 62h42 | 66h23 | 20 upgrades, 4 bosses, 20 resets |
| Perfil AFK do benchmark | Não terminou em 72h | Não terminou em 72h | 18 upgrades, 3 bosses, 18 resets |

Os tempos são decorridos, não apenas tempo presente. Na primeira semente, o Casual esteve presente por aproximadamente 25h07. O Ativo fez cerca de **236 mil cliques na Esfera**, além de compras e Bênçãos. Portanto, 32h51 não é uma estimativa de duração para alguém que abre o jogo ocasionalmente.

O perfil chamado AFK **continua comprando, evoluindo e resetando automaticamente pela política do simulador**, mesmo antes de o jogador possuir as respectivas automações. Apenas interrompe cliques e Bênçãos manuais após os primeiros dez minutos, com a exceção de recuperação após reset, e não coleta milagres nem fendas. Não representa ausência total de interação.

Todos esses cenários mantêm o jogo aberto e visível. Não simulam a aba oculta nem o cálculo de ganhos offline. Duas sementes verificam alguma sensibilidade ao acaso; não substituem testes com jogadores.

### Onde estão as esperas importantes

Semente 786802, tempo entre as duas compras permanentes indicadas:

| Trecho | Ativo | Casual | AFK do benchmark |
| --- | --- | --- | --- |
| Culto Autônomo → Congregação Esférica | 3h14 | 5h20 | 5h59 |
| Alquimia Hermética → Fogo Hermético | 2h50 | 3h54 | 4h02 |
| Fogo Hermético → Olho do Infinito | **9h58** | **12h26** | **19h27** |
| Olho do Infinito → Gnosis Suprema | 1h04 | 3h58 | **22h04** |
| Gnosis Suprema → Fogo Empíreo | 1h22 | 8h20 | Não alcançado |
| Fogo Empíreo → Opus Perfeito | 1h24 | 7h57 | Não alcançado |

Esses trechos podem conter compras menores, evolução do Avatar e aumentos de produção. Não significam ausência completa de ações. Significam longos períodos sem a próxima compra permanente.

O benchmark marca qualquer compra como progresso. Por isso o Ativo pode receber **zero “zonas mortas”** mesmo passando quase dez horas entre dois upgrades de Gnose. A métrica atual não basta para avaliar a sensação de parede.

## 3. Ganho de Gnose versus custo de reconstrução

Sem Olho de Trismegisto:

`G = floor((F / 1e15)^0.15)`

Invertendo o limiar matemático:

`F_alvo(g) = 1e15 * g^(1/0.15)`

| Gnose desejada em uma ascensão | Fé mínima teórica |
| --- | --- |
| 1 | 1e15 |
| 2 | 1,016e17 |
| 3 | 1,516e18 |
| 8 | 1,049e21 |
| 10 | 4,642e21 |
| 78 | 4,111e27 |
| 120 | 7,265e28 |

**Dobrar de 1 para 2 Gnose exige aproximadamente 101,6 vezes mais Fé guardada.** Com expoente 0,17, ainda exige cerca de 59 vezes. São limiares de saldo para aquela ascensão, não custos totais da campanha: Gnose de várias ascensões pode ser somada, e o saldo já disponível reduz o que falta comprar.

A árvore custa **6.998 Gnose** ao todo. Antes de melhorá-la, a fórmula pede aumentos enormes de Fé para aumentar modestamente o retorno de cada reset. Ao mesmo tempo, a reconstrução perde todos os ritos e, inicialmente, as relíquias.

O multiplicador histórico ajuda, mas não compensa cada perda na mesma proporção:

- `Gh=1`: 2,50×.
- `Gh=3`: 3,20×, somente 28% acima do valor anterior.
- `Gh=5`: 3,63×, somente 13,5% acima do anterior.

O ganho total de uma ascensão também inclui o upgrade comprado, conquistas e eventuais bosses; esses números isolam apenas `MG`.

Na primeira semente, Memória, Chama, Alquimia e Ruptura foram compradas com intervalos próximos de uma hora entre elas. Há aceleração, mas os primeiros ciclos ainda repetem muito trabalho para avanços permanentes modestos.

### Esperar ou repetir resets?

Comparei a política existente com uma variante que ascende assim que há pelo menos 1 Gnose, desde que exista um próximo upgrade elegível. Ela mantém os mesmos custos, perdas, interações e confirmações. O ganho efetivo pode ultrapassar 1 entre decisão e execução.

| Política ativa, semente 786802 | Resultado |
| --- | --- |
| Esperar o necessário para a próxima compra | 16 upgrades e 16 resets em 24h; termina em 32h51 com 20 resets |
| Ascender assim que possível | 19 upgrades e 2.839 resets em 24h; termina em **24h13 com 2.921 resets** |

A segunda política é pior em alguns trechos iniciais e melhor depois; não prova que resetar sempre seja ótimo. Demonstra uma alternativa indesejável de experiência: **esperar horas ou repetir milhares de resets**. É preciso equilibrar Gnose por minuto incluindo reconstrução, não simplesmente perseguir o preço do próximo nó em uma única ascensão.

## 4. O poder está concentrado em poucos upgrades

Congregação Esférica custa 10 Gnose e concede `1 + N^1.5` a toda Fé:

- 100 Fiéis: 1.001×.
- 300 Fiéis: aproximadamente 5.197×.
- 500 Fiéis: aproximadamente 11.181×.

Esse salto é muito maior que os ganhos dos nós iniciais. Chama Astral, por exemplo, melhora o multiplicador do rito de produção em cerca de 10,3% no nível 10, além da redução de custo. Alquimia Astral melhora o multiplicador do rito de Fragmentos em cerca de 6,8% nesse nível, além da redução de custo.

Um salto grande pode ser satisfatório. O problema é concentrar a saída da estagnação em um nó específico e obrigar a reconstruir várias vezes antes de acessá-lo. Um jogador que compra conforto ou outro ramo primeiro pode demorar muito mais.

Os Fiéis já possuem crescimento aproximadamente quadrático em `N` quando o rito de Fiéis domina, porque a produção base e esse rito dependem de `N`. Com Congregação, esse componente aproxima-se de `N^3.5`; com Coro, `N^3.6`, mantendo os demais fatores fixos. Mesmo assim, o custo exponencial `escala^N` acaba ultrapassando esse crescimento. É uma boa fonte de desaceleração, desde que outra camada ofereça uma saída acessível.

Nos ritos ocorre algo parecido: o custo de produção sobe 80% por nível inicialmente, enquanto o ganho marginal diminui. No nível 20, o próximo nível dá aproximadamente +13,2% àquele multiplicador; no nível 40, +9,9%. Isso cria estagnação de maneira consistente, mas requer marcos bem distribuídos para encerrá-la.

## 5. Comprar upgrades pode derrubar a produção

**Arca:** o nível cresce, mas o bônus usa os Fragmentos que sobraram.

Com Arca nível 3 e exatamente 15.000 Fragmentos:

- Antes: `(log10(15001)+1)^3.6 ≈ 371,9×`.
- Compra do quarto nível: saldo cai para zero.
- Depois: `(log10(1)+1)^4.8 = 1×`.

É uma redução imediata de aproximadamente **99,73% no fator da Arca**, mantendo os outros fatores constantes. A produção se recupera conforme novos Fragmentos chegam; o tempo depende de `W`. Não é um bloqueio permanente, mas contradiz a expectativa de que comprar o último nível melhora a produção imediatamente.

**Fervor:** gastar o saldo reduz simultaneamente `BF` e `I`. Uma compra pode elevar o efeito de um rito e ainda diminuir a Fé/s no instante seguinte. A automação que compra sempre o mais barato não verifica esse retorno líquido.

**Transmutação:** zera Fé, reduz a sinergia que usa Fé guardada, zera a base percentual dos milagres e pode afastar a ascensão. Como a recompensa é logarítmica, multiplicar a Fé por dez acrescenta apenas cerca de 3,32 Fragmentos antes do rito de Fragmentos. O jogador precisa de uma indicação clara do tempo de recuperação desse sacrifício.

Uma correção possível é calcular os bônus de estoque sobre o **maior saldo do ciclo atual**, ou sobre recursos gerados nesse ciclo, mantendo o saldo gastável separado. Esses novos contadores devem zerar na Gnose. Usar diretamente `Vh` ou `Rh` existentes mudaria a regra de reset, pois eles hoje persistem.

## 6. Milagres viram parte essencial da economia tardia

O termo `0.10*F` gera crescimento composto. Sem gastos entre coletas, cada milagre aumenta o saldo em pelo menos aproximadamente 10%, além do componente de produção:

`F_depois ≈ 1.1 * F_antes + 30 * P`

Somente a parcela percentual multiplica o saldo por dez após cerca de 24,2 coletas em uma aproximação contínua; seriam 25 coletas inteiras para ultrapassar 10×. Uma coleta a cada 50 s equivale a cerca de vinte minutos. Isso é uma ilustração isolada, não previsão da campanha, que contém gastos e resets.

Para medir a relevância, mantive o perfil ativo com seus cliques, compras e Bênção, mas defini a chance de coletar milagres como zero:

- Com milagres: campanha concluída em 32h51.
- Sem milagres: **18/20 upgrades após 72h**, mesmo mantendo as demais atividades.

Uma única semente nessa comparação não quantifica toda a distribuição, mas mostra que o milagre não funciona apenas como bônus de conveniência nessa política. Ele ajuda a vencer as paredes tardias. Remover ou limitar o termo percentual sem fortalecer outra fonte de avanço agravaria o problema.

Além disso, a arena agenda milagres por frames. Desempenho gráfico pode mudar a economia por hora. A taxa deveria depender do tempo decorrido para não premiar hardware/FPS.

## 7. Automação e ausência do jogador

Auto-Fiéis não reserva Fé para um selo, Avatar ou ascensão futura. A prioridade dos selos só ajuda quando o saldo já é suficiente no instante do ciclo. O benchmark pausa Auto-Fiéis ao estimar um objetivo a menos de 180 s, comportamento que um jogador precisa reproduzir manualmente.

Mantendo Auto-Fiéis ligada, com as outras decisões iguais, o Ativo chegou a 15 upgrades em 24h, contra 16 na política original. Também realizou resets adicionais porque compras podem consumir Fé entre a decisão e a confirmação. Não houve bloqueio absoluto nessa janela, mas houve atraso e desperdício de reconstrução.

Auto-Relíquias compra por menor preço: os 20 níveis de Cornucópia e os 20 de Tocha aparecem antes da Fênix nessa ordem, consumindo 14.000 Fragmentos antes dela quando as compras seguem essa prioridade. Isso não equivale a maximizar retorno ou priorizar um desbloqueio. O impacto temporal depende da geração de Fragmentos.

Há ainda uma limitação real fora das fórmulas: ao ocultar a página, o loop pausa; voltar à mesma aba apenas retoma o loop, sem creditar toda a ausência. O cálculo offline é chamado ao carregar o save. Mesmo nesse caminho, usa taxas pontuais e até 60 ciclos de automação, não a mesma evolução online. Isso precisa ser resolvido antes de usar resultados do benchmark como experiência de um jogador casual.

## 8. Avatares e bosses

Os custos dos Avatares têm saltos desiguais: `1e12 → 1e25 → 1e150`. O último salto é de 125 ordens de grandeza. Com Gnosis Suprema, os finais passam para `1e20` e `1e36`.

`1e150` é representável pelo tipo numérico, mas não serve como preço economicamente gradual nesse percurso. Funciona como uma trava prática até o desconto de Gnose. Se essa é a intenção, é mais claro declarar o requisito da Gnose e mostrar o preço real da etapa depois dele.

Não se deve comparar diretamente HP dos bosses com Fé/s: vários termos de dano são proporcionais ao próprio HP máximo. O HP cancela ao avaliar a fração de vida removida por segundo. A preparação importa, mas os referenciais de estágio não são requisitos rígidos. Na variante de resets curtos, a campanha terminou no estágio 1 após o último reset; Avatar Solar não é obrigatório para concluir a árvore e vencer Caos. Portanto, não conte com o Solar como a saída obrigatória de uma parede anterior.

## 9. Ajustes recomendados, em ordem

1. **Garantir progresso durante ausência.** Unificar o tratamento de tempo ao retornar de aba oculta e ao carregar save, e medir esse caminho separadamente do jogo sempre visível.
2. **Evitar compras com regressão inesperada.** Rever estoques usados pela Arca e pelo Fervor, ou preservar uma reserva e mostrar ganho líquido/tempo de recuperação. Qualquer memória adicional de recurso deve respeitar o reset de Gnose.
3. **Dar objetivo às automações.** Reservar para o próximo marco escolhido e priorizar desbloqueios/retorno, em vez de sempre gastar 100% no menor preço. O resultado deve ser avaliado pelo tempo até o marco, não pelo número de compras.
4. **Distribuir melhor o poder permanente.** Antecipar uma parte da aceleração de reconstrução e da sinergia dos Fiéis. Reavaliar Cripta a 78 Gnose: na política original ela só chega aproximadamente às 13h48 do Ativo, após muitas reconstruções de relíquias.
5. **Recalibrar ganho e custos de Gnose em conjunto.** Como ensaio, expoente 0,30 faria a passagem de 1 para 2 Gnose exigir cerca de 10,1× Fé, em vez de 101,6×. Isso não é um valor final recomendado: pode acelerar demais os trechos depois de Congregação. Também é possível reduzir custos ou inserir ganhos de Gnose sem exigir resets tão frequentes. Testar políticas de ciclos curtos, médios e longos antes de escolher.
6. **Reequilibrar milagres junto com a economia passiva.** Um prêmio ligado a segundos de produção tem comportamento mais previsível que juros ilimitados sobre saldo, mas precisa vir acompanhado de poder passivo suficiente para substituir o avanço perdido.
7. **Medir progresso relevante.** Registrar tempo até novo sistema, upgrade permanente, recuperação do marco anterior, aumento substancial de produção e quantidade de ações repetidas por ciclo. Pequenas compras isoladas não bastam para declarar ausência de parede.

Metas iniciais para testar, e não números já validados: primeiras mecânicas em poucos minutos; reconstrução de um marco anterior em 10–25% do tempo gasto originalmente; próximo ganho permanente perceptível dentro de uma sessão ativa de 15–30 minutos; ausência de trechos acima de uma hora sem uma alternativa clara de avanço. Para as sessões casuais de oito minutos usadas no benchmark, deve existir um marco menor útil dentro da sessão ou ganho relevante recebido na volta.

O início já oferece bons sinais: no Ativo, primeiro Fiel em 6 s, Encarnação em 47 s, ritos em 2m21, Avatar 2 em 13m34 e Relíquias em 14m18. Eu preservaria essa cadência inicial enquanto corrigiria a relação entre perdas do reset, ganho de Gnose, automação e progresso tardio.

## 10. Reprodução e evidências

- [Comparação visual interativa](Base/analise-progressao-2026-10-29.html).
- [Dados dos benchmarks e experimentos](Base/analise-progressao-2026-10-29.json).
- [Script dos experimentos](scripts/analyze-progression.mjs): aplica diferenças de política apenas aos módulos carregados em memória; não edita o jogo.
- [Documento de fórmulas analisado](FormulasJogo.md).
- Fontes centrais: [estado/reset/automações](src/core/GameState.ts), [cálculos](src/systems/calculations.ts), [simulador](src/benchmark/ProgressionSimulator.ts), [métrica de estagnação](src/benchmark/ProgressTracker.ts), [ausência/offline](src/main.ts).

```bash
nix-shell --run 'node scripts/run-benchmark.mjs --seeds=786802,42 --hours=72 --json'
nix-shell --run 'node scripts/analyze-progression.mjs baseline 24 active 786802'
nix-shell --run 'node scripts/analyze-progression.mjs no-miracles 72 active 786802'
nix-shell --run 'node scripts/analyze-progression.mjs short-resets 26 active 786802'
nix-shell --run 'node scripts/analyze-progression.mjs no-auto-pause 24 active 786802'
```

Os experimentos isolam mudanças de comportamento, não propostas de novas fórmulas. Não foi implementado nem validado um novo balanceamento nesta análise.
