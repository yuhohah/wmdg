# Revisão do ritmo da Gnose — 10/11/2026

A captura revela um problema de ritmo e apresentação, sem divergência na fórmula de ganho. Esta seção registra o diagnóstico anterior à alteração; a implementação aprovada está descrita em [gnose-cost-smoothing-2026-11-10.md](gnose-cost-smoothing-2026-11-10.md).

## O que a imagem mostra

Com aproximadamente 4,83e22 Fé, a fórmula `floor((Fé / 1e15)^0,25)` concede 83 Gnose, como exibido. Os dois nós assimilados são Emanação Primordial (1) e Memória Hermética (57); o saldo é 4. O próximo nó elegível mais barato é Culto Autônomo (1.100), não Chama Astral (290.000).

Para comprar Culto Autônomo em uma única nova Ascensão, faltariam 1.096 Gnose: aproximadamente 1,443e27 Fé, ou 29.870 vezes o saldo de Fé da captura. Isso não é uma estimativa de duração nem a exigência de uma única Ascensão: também é possível acumular Gnose em vários ciclos, cuja produção aumenta.

O ganho usa uma raiz quarta: multiplicar apenas a Fé por 16 dobra a Gnose. Isolando o efeito direto, um bônus de 4× Fé rende cerca de 1,414× Gnose. Como os nós também afetam outros pilares, o ritmo total deve ser medido com a economia completa.

## Problemas confirmados

1. A ordem visual confunde a progressão. No Tier I, os custos aparecem como `1 → 57 → 290.000 → 340.000.000 → 1.100 → 26.000`. São cards dispostos na ordem do catálogo; a sequência visual não indica o próximo alvo por custo/pré-requisito.
2. O começo da árvore concentra esperas longas. Depois da Memória, a automação de Fiéis custa 19,3 vezes mais Gnose; depois dela, Ruptura custa 23,6 vezes mais. As compras de conforto demoram a aliviar a repetição dos ciclos.
3. O fim acelera excessivamente em relação ao começo. Há várias esperas de dezenas de minutos por nó no início, seguidas de três compras finais em poucos minutos, apesar dos preços enormes. A realimentação da economia supera a curva de custos nessa etapa.

## Simulações novas

Seed 42; regras atuais do workspace; subpassos de 0,1 segundo; estado inicial novo; ausência visível padrão. Horizontes de 16 h no Ativo e 20 h no Casual. Ambos concluíram 20/20 nós e 4/4 chefes. O perfil Casual alterna oito minutos presente e doze ausente; o Ativo mantém presença, Bênção, compras e combate. São políticas de simulação, não tempos garantidos para jogadores.

- **Ativo:** campanha completa em 8h30min. Primeira compra da Gnose aos 79,8 min; Memória aos 109,5 min; Culto Autônomo aos 138,8 min; Ruptura aos 181,5 min. Intervalos após Memória: 29,3 min até Culto, 42,7 min até Ruptura e 33,1 min até Chama Astral.
- **Casual:** campanha completa em 12h27min. Memória aos 205,8 min; Culto aos 264,5 min; Ruptura aos 362,6 min. São 58,7 min de Memória a Culto e 98,1 min de Culto a Ruptura, incluindo as ausências programadas.
- **Reta final:** de Olho do Infinito à compra dos três nós restantes/árvore completa, 5min44s no Ativo e 6min29s no Casual: aproximadamente 1,13% e 0,87% da duração total das respectivas campanhas. O relógio anterior ao primeiro nó não foi contado como espera entre compras da Gnose.
- **Controle sem milagres:** Ativo/seed 42 concluiu em 10h11min. A duração depende da coleta e política de interação; não se deve extrapolar a captura para uma previsão de espera do jogador.

SHA-256 do catálogo analisado `src/config/gnose.ts`: `d7000de3753e1eed426a671501b4e598ea4c53bd16a90a24b300421df2223502`.

## Direção de ajuste recomendada

- Ordenar os cards de cada tier por progressão acessível e custo, explicitando o próximo alvo elegível.
- Reduzir os degraus de entrada, principalmente automações iniciais e Chama Astral, e distribuir seus efeitos em intervalos mais regulares.
- Recalibrar os últimos nós para que não sejam consumidos quase em sequência após Olho do Infinito. Isso exige medir conjuntamente custos, ressonância, automações e efeitos de produção.
- Definir metas de espera por fase e validar o percurso inteiro em várias seeds/perfis, incluindo uma política menos otimizada de Ascensão. O simulador padrão sabe escolher o menor custo elegível e espera o alvo de Gnose; o jogador da captura pode ascender antes disso. Não é correto tratar essa política como representação exata do jogador.

Não foi escolhida uma nova tabela de preços nesta investigação: os resultados justificam reequilibrar o ritmo, mas não sustentam números novos sem uma rodada de calibração e uma meta de duração.

## Ferramenta de análise

A primeira execução encontrou um erro em `scripts/analyze-progression.mjs`: o wrapper de `GameStateManager.tick()` descartava os ganhos retornados, interrompendo a coleta de métricas. O retorno foi preservado e as três simulações acima concluíram. Essa correção afeta apenas a ferramenta de análise, sem alterar as regras do jogo.

Artefatos detalhados (ignorados pelo Git): `reports/gnose-progress-audit-2026-11-10-active.json`, `...-casual.json` e `...-no-miracles.json`. Testes de benchmark e revisão da Gnose também foram executados.
