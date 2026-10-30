# Plano de melhoria da progressão

Proposta de 29/10/2026, baseada em [AnaliseProgressao.md](AnaliseProgressao.md). Este documento define metas e a sequência de implementação. Os parâmetros candidatos ainda precisam de simulação; não constituem um novo balanceamento validado.

## 1. Objetivo e condições de sucesso

**Concluir a campanha ativa — 20 upgrades de Gnose e Caos Primordial derrotado — em menos de 20 horas.** Trabalhar com mediana-alvo de **14–16 horas**, deixando margem para escolhas diferentes e variação de comportamento.

O teto é critério de aceitação dos cenários definidos, não promessa para qualquer jogador. No perfil ativo, medir tempo de jogo acumulado sem acelerar a simulação; distinguir esse tempo do calendário nos perfis com ausências.

Critérios adicionais propostos:

- Após a primeira ascensão, um novo avanço permanente normalmente a cada **20–45 minutos**, sem intervalos superiores a **60 minutos** nas rotas de referência.
- Uma decisão ou ganho relevante em **2–5 minutos** durante a presença. Um pequeno incremento automático, sozinho, não satisfaz esse critério.
- Recuperar a produção sustentada anterior em até **25% da duração do ciclo anterior**, com teto orientador de **10 minutos**, a partir do terceiro ciclo.
- Campanha de referência com **15–35 resets**, aceitando até **40**. Uma rota excepcionalmente eficiente pode usar menos; milhares de resets não devem ser necessários nem trazer vantagem relevante.
- Comprar melhorias de produção não deve reduzir imediatamente a produção por consumir o estoque que determina seu próprio bônus.
- O jogador deve conseguir concluir abaixo de 20 horas sem clicar continuamente durante toda a campanha e sem coletar quase todos os milagres.

“Avanço relevante” inclui novo sistema, upgrade permanente, Avatar, boss, recuperação de um marco anterior ou aumento sustentado de pelo menos 25% na produção. Registrar cada categoria separadamente: aumentos de produção não podem esconder horas sem avanço permanente.

## 2. Regra do reset

Manter o reset de Fiéis, ritos, Fervor, Fragmentos e Avatar. Relíquias reiniciam até existir Cripta; Memória e outras preservações explícitas continuam sendo efeitos de Gnose.

As fórmulas propostas não devem usar históricos permanentes para conservar, por acidente, o poder econômico de uma ascensão anterior. Qualquer novo contador de recurso do ciclo zera na Gnose.

Para manter comparabilidade com a análise, esta proposta conserva as regras atuais de conquistas e vitórias contra bosses. Apagá-las também seria uma alteração de escopo e exigiria uma nova referência de balanceamento.

## 3. Etapa 1 — Medir a experiência que queremos entregar

**Implementar primeiro, antes de calibrar preços.**

Evoluir o benchmark para registrar:

- Tempo entre compras permanentes, desbloqueios e bosses.
- Tempo para recuperar a média de Fé/s dos últimos 60 s do ciclo anterior, em vez de um pico instantâneo.
- Gnose por minuto incluindo a reconstrução; quantidade de resets e compras repetidas.
- Quedas de produção imediatamente após compras e tempo de recuperação.
- Participação de milagres, cliques e produção passiva na Fé obtida.
- Tempo previsto e realizado até o objetivo escolhido pelo jogador.

Adicionar um perfil **ativo de referência** que acompanha o jogo, faz compras e combates, mas clica na Esfera em rajadas de 10 s por minuto, a 2 cliques/s, e coleta cerca de 70% dos milagres disponíveis. Compras, Bênção e combate continuam consumindo orçamento de interação. Esses valores são hipóteses de teste, não dados de jogadores.

Manter o Ativo atual, mais intenso, como comparação. Acrescentar variantes sem milagres, com outras ordens de compra e com resets curtos/médios/longos. O perfil ativo de referência será a medida principal do teto de 20 horas.

**Entrega:** relatório que mostre as paredes mesmo quando existem compras pequenas entre elas. Preservar os resultados antigos como referência; não alterar retroativamente o significado das métricas.

## 4. Etapa 2 — Corrigir perdas de progresso e compras frustrantes

### Produção após compras

Criar `fervorPeakThisRun` e `relicPeakThisRun`, maiores saldos obtidos na ascensão atual. Atualizá-los no recebimento dos recursos, antes de compras automáticas no mesmo ciclo; salvar e carregar ambos.

- `BF` e `I` passam a usar o pico de Fervor do ciclo.
- Arca passa a usar o pico de Fragmentos do ciclo.
- Saldos disponíveis continuam pagando compras normalmente.
- Os picos zeram na Gnose, inclusive quando Cripta preserva os níveis das relíquias.
- Saves anteriores iniciam esses picos a partir dos saldos conhecidos; não reconstruir o valor a partir dos históricos permanentes.

Isso muda deliberadamente o incentivo de guardar recursos: gastar deixa de apagar o poder já conquistado naquele ciclo. Medir a aceleração causada por essa mudança antes de ajustar Gnose.

### Ausência e retorno

Usar o mesmo tratamento de tempo transcorrido para voltar à aba e carregar save, com crédito exatamente uma vez. Preservar o limite atual de 24 h inicialmente. Simular produção e automações com precisão suficiente, comparando períodos de 1 min, 10 min, 1 h e 24 h contra uma referência online.

Compras automáticas só ocorrem quando seus upgrades existem e estão ativos. Ausência não deve conceder cliques, milagres coletados ou vitórias de combate que dependam de intervenção.

**Aceitação:** nenhuma perda do período oculto, nenhum crédito duplicado e nenhuma queda de Fé/s causada exclusivamente pelo gasto de Fervor/Fragmentos numa compra de produção. A aproximação offline deve documentar sua tolerância e ser medida antes de uso nos resultados da campanha.

## 5. Etapa 3 — Automação e reconstrução com menos repetição

### Automações orientadas por objetivo

Adicionar seleção simples de objetivo: próximo Selo, Avatar ou quantidade desejada de Gnose. Mostrar o que está sendo poupado e permitir trocar o objetivo.

Auto-Fiéis deve comparar investir versus guardar, usando o tempo estimado até o objetivo. Como primeira regra verificável, reservar o saldo quando o objetivo estiver a até 180 s pela taxa atual; fora dessa janela, comprar apenas se o investimento melhorar a estimativa. A mesma lógica deve estar no jogo e no benchmark.

Auto-Ritos deve considerar efeito líquido e recurso necessário para desbloqueios. Auto-Relíquias deve antecipar desbloqueios como Fênix e avaliar retorno, sem comprar obrigatoriamente todos os níveis baratos primeiro. Antes de uma transmutação ou ascensão, mostrar quanto será perdido e o ganho efetivo no momento da confirmação.

### Antecipar conforto

Testar estes preços como primeira família de candidatos, mantendo inicialmente os demais:

- Culto Autônomo: **8 → 4 Gnose**.
- Liturgia Autônoma: **15 → 8 Gnose**.
- Oficina Autônoma: **20 → 10 Gnose**.
- Cripta Eterna: **78 → 25 Gnose**, mantendo seus pré-requisitos e Tier 2.

Esses valores devem ser aplicados e medidos como um conjunto próprio, antes de aumentar o expoente da Gnose. Verificar também o tempo de acesso aos tiers: baixar o preço não resolve um requisito de boss que ainda esteja distante.

Para reduzir trabalho manual, testar Bênção com **10 s por acionamento**, mantendo o teto de 60 s e o bônus de 2×. A referência atual já mantém o bônus quase continuamente; a mudança pretende reduzir esforço, não elevar o multiplicador.

**Aceitação:** o objetivo escolhido não é sistematicamente adiado pela automação; reconstrução acelera a cada ciclo; o jogador deixa de repetir centenas de compras antes de ter ferramentas de automação.

## 6. Etapa 4 — Recalibrar Gnose e distribuir os saltos de poder

### Fórmula de ascensão

Manter inicialmente o piso de Fé para ascensão em `1e15`. Comparar, sobre a economia já corrigida, três pares de expoentes:

- **0,22 → 0,25**, após Olho de Trismegisto.
- **0,25 → 0,28**.
- **0,30 → 0,33**.

Usar **0,25 → 0,28 como candidato central**, não como decisão final. Sem Olho, obter 2 Gnose passaria a exigir 16× a Fé necessária para 1, em vez de 101,6×. O ganho continua premiando uma ascensão mais profunda, mas o efeito sobre milhares de Gnose será grande e precisa de calibração conjunta dos preços finais.

Não reduzir todos os preços proporcionalmente. Manter os preços dos nós tardios na primeira rodada, observar o tempo até cada compra e ajustar os gargalos localmente. Um candidato que termine muito rápido mas concentre o progresso em um único salto também deve ser rejeitado.

Rever o Selo da Gnose para que alcançar `1e15` dê acesso à primeira ascensão sem exigir juntar esse saldo novamente. Preferência inicial: tornar esse selo um desbloqueio por atingir o limiar, sem cobrança; os outros selos continuam compras.

### Poder permanente

Antecipar parte da aceleração que hoje chega com Congregação. Distribuir o poder entre a primeira melhoria econômica, a reconstrução inicial e a própria Congregação, preservando um salto perceptível quando ela for comprada.

Calibrar cada nó em estados reais salvos pelo benchmark: comparar a mesma economia com e sem a compra. Evitar que uma única compra explique milhares de vezes mais produção e seja a única saída viável de um ramo. Redistribuir poder antes de reduzir o multiplicador final; uma redução isolada agravaria as paredes.

### Resets curtos versus ciclos completos

Comparar Gnose/minuto com reconstrução incluída. A melhor política saudável deve concluir com até 40 resets; uma política de reset imediato não deve obter vantagem de duração superior a 10% às custas de centenas de repetições.

Se o abuso persistir, ajustar a remuneração de ciclos mais profundos e as faixas de custo. Não introduzir cooldowns ou espera obrigatória como primeira solução.

**Aceitação:** mediana de 14–16h, todas as rotas ativas de referência abaixo de 20h e nenhum intervalo de mais de 60 min entre avanços permanentes após a primeira ascensão.

## 7. Etapa 5 — Milagres opcionais e final com avanços visíveis

### Milagres

Trocar a contagem de frames por tempo transcorrido. Depois de calibrar a economia passiva, testar a recompensa:

`max(30, 15*C, floor(30*P + min(0.10*F, 60*P)))`

Essa candidata mantém a ajuda inicial e limita a parcela de juros a 60 s de produção. Não deve ser aplicada isoladamente à economia atual: o experimento sem milagres mostrou que isso poderia prolongar a campanha significativamente.

**Aceitação:** o perfil ativo sem milagres também termina abaixo de 20h; a diferença para coletá-los fica, como objetivo inicial, em até 25% de duração. Coletar continua gratificante, mas não se torna a única saída de uma parede.

### Avatares e encerramento

Substituir o preço prático de bloqueio `1e150` por um requisito explícito de Gnosis Suprema e um preço calibrado para o momento em que o Solar deve aparecer. Mostrar o requisito claramente na interface.

Planejar o Solar como conquista útil antes de Caos. Não torná-lo obrigatório para o combate sem antes verificar o impacto: hoje é possível terminar após um reset ainda no estágio 1. Medir a fração de HP removida, preparação e interação de combate; HP nominal sozinho não mede dificuldade econômica.

**Aceitação:** o fim oferece novos ganhos de poder durante a última etapa; o Solar tem oportunidade de uso antes da conclusão, sem criar outra parede obrigatória.

## 8. Ritmo pretendido

Estes são intervalos orientadores para o ativo de referência, não horários fixos de desbloqueio:

- **0–20 min:** Fiéis, Fervor, Avatar inicial e acesso a Relíquias. Preservar a boa cadência existente.
- **45–75 min:** primeira ascensão, com vantagem clara na reconstrução seguinte.
- **1–3 h:** primeiras automações e ciclos mais curtos.
- **3–6 h:** sinergia dos Fiéis e persistência de relíquias acessíveis.
- **6–10 h:** desenvolvimento dos ramos intermediários e bosses correspondentes.
- **10–13 h:** automação avançada e abertura do trecho final.
- **14–16 h:** árvore concluída e vitória final na rota típica.
- **Menos de 20 h:** limite para todas as rotas ativas de referência aprovadas.

Os intervalos entre essas etapas precisam conter vários avanços menores e permanentes; não justificam uma espera de três horas por um único nó.

## 9. Validação e sequência de entrega

Implementar em entregas separadas: **métricas → estoques e ausência → automações e conforto → Gnose e poder → milagres e final → calibração integrada**. Registrar o efeito de cada entrega sobre os mesmos cenários e sementes.

Na exploração, usar três sementes fixas e os estados salvos próximos aos gargalos. Após escolher os candidatos, executar uma bateria final de **20 sementes**, com:

- Ativo de referência e Ativo intenso original.
- Ativo sem milagres e com prioridade inicial em conforto ou produção.
- Políticas de resets curtos, médios e longos.
- Casual em sessões e retorno real de aba oculta/save.
- Ausência real sem ações manuais, distinguindo-a do atual perfil chamado AFK.

Publicar mediana, pior tempo observado, campanhas incompletas, maiores intervalos entre marcos e resets realizados. Não excluir campanhas incompletas dos critérios de aprovação. Todos os cenários ativos de referência devem concluir abaixo de 20h; o P95 não deve esconder uma execução acima do teto.

Acrescentar testes de invariantes para reset dos novos contadores, compras sem perda involuntária de bônus, crédito offline único, reservas das automações e salvamento/migração. Para mudanças em preços de Gnose, definir e testar reembolso da diferença para compras antigas, sem aumentar Gnose histórica e sem aplicar o reembolso novamente a cada carregamento.

Por fim, fazer sessões com jogadores observando tempo para entender o próximo objetivo, necessidade de consultas externas e sensação de reconstrução. As simulações demonstram alcance e ritmo das políticas; não comprovam satisfação humana.

**Condição de conclusão do trabalho futuro:** atingir as metas de duração e ritmo, documentar os parâmetros escolhidos, atualizar `FormulasJogo.md` e publicar a comparação antes/depois. Terminar abaixo de 20h com a mesma parede no meio ou exigindo milhares de resets não satisfaz este plano.
