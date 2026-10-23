| Parâmetro | Devoto Fervoroso (Ativo) | Devoto Regular (Casual/Híbrido) | Ocioso Puro (AFK) |
|---|---|---|---|
| **Cadência de Cliques Inicial (CPS)** | **5.0 cliques/s** (200ms por clique) | **2.0 cliques/s** (500ms por clique) | **1.0 clique/s** (1000ms por clique) |
| **Tempo até 1º Fiel (20 Fé)** | **4.0 segundos** | **10.0 segundos** | **20.0 segundos** |
| **Comportamento Pós-Primeiro Fiel** | Mantém cliques estratégicos e ativos | Cessa cliques na Esfera, foca em compras | **Zero cliques na Esfera** (100% passivo) |
| **Tempo Médio de Reação à Compra** | **3.0 segundos** (atenção focada) | **5.0 segundos** (atenção dispersa/híbrida) | **0.0 segundos** (analítico por lote de espera) |
| **Captura de Milagres dos Fiéis** | **~95% dos milagres** capturados | **~40% dos milagres** capturados | **0% dos milagres** (ignora o pátio) |
| **Frequência de Spawn de Milagres** | A cada ~35s–65s (média 50s com fiéis) | A cada ~35s–65s (média 50s com fiéis) | Apenas acumulam sem clique |
| **Recompensa por Milagre Concedido** | $\max(30, 30 \times \text{Fé/s} + 10\% \text{FéAtual})$ | $\max(30, 30 \times \text{Fé/s} + 10\% \text{FéAtual})$ | Não aplicável |
| **Manutenção da Bênção do Avatar (2x Fé)** | **100% ativa** (renova a cada 60s) | Ocasional / Inconstante | **Nunca ativada** (0s de bênção manual) |
| **Frequência de Checagem do Jogo** | Contínua (tempo real na tela) | Sessões intercaladas com pausas de 5-15m | Sessões espaçadas de 30m a 2h |
| **Estratégia de Compra** | Greedy por menor ROI / Tempo de Retorno | Híbrida (Desbloqueios + mais baratos) | Compra em lote quando há saldo elevado |

> **Nota sobre o Tempo de Reação**: Quando um upgrade se torna acessível ($\text{tempoNecessário} > 0$), o jogador humano não clica no milissegundo exato em que a moeda atinge o valor da compra. O simulador adiciona o tempo de reação humano ($3.0\text{s}$ para Ativo e $5.0\text{s}$ para Casual) ao tempo de acumulação do recurso, tornando a projeção realista.

> **Nota sobre Milagres dos Fiéis**: No pátio de fiéis, devotos geram pedidos de oração periódicos (balões de milagre com vida útil de 15s). Ao serem clicados, eles concedem $30\text{s}$ de produção instantânea de Fé somados a $10\%$ do saldo atual da reserva. O jogador **Ativo** (com a tela sempre aberta e focada) intercepta praticamente todos os milagres (~95%), gerando impulsos substanciais de fé que aceleram marcos intermediários como o Avatar Consagrado e o Selo de Relíquias. O jogador **Casual** captura cerca de 40%, enquanto o jogador **AFK** não clica em nenhum milagre.
