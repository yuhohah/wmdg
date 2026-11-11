# Salto na produção de Fragmentos após Ascensão e Transmutação — 10/11/2026

## Conclusão

O salto foi reproduzido. Nos cenários testados, a implementação corresponde à fórmula documentada em `FormulasJogo.md`, seção 7.2. Não foi encontrada aplicação duplicada da ressonância da Gnose nem persistência indevida do recorde da Transmutação entre Ascensões. O salto pode ser muito grande por causa da combinação da melhor Transmutação do ciclo com o efeito exponencial do Rito de Fragmentos. É um ponto de balanceamento da fórmula atual, sem erro de execução identificado nestes cenários.

Não foram alteradas as fórmulas de produção ou os saves. Foram adicionados testes da sequência de ações relatada pelo usuário.

## Reprodução mínima

1. Assimilar Emanação Primordial (ressonância 4×).
2. Realizar Ascensão com Fé suficiente. O recorde manual da Transmutação é zerado.
3. Reabrir os Selos e reunir `1e16` Fé.
4. A geração inicial é 4 Fragmentos/s.
5. Transmutar: recebe 53 Fragmentos e registra melhor Transmutação de 53.
6. A base passa de 1 para `piso(53/10) = 5`; com ressonância 4×, a geração passa para 20 Fragmentos/s.

A elevação é de 5×, mesmo sem Rito de Fragmentos, Draupnir ou Olho do Infinito. Repetir uma Transmutação igual ou menor não soma novos bônus à base.

## Hipóteses verificadas

1. **Atualização do recorde do ciclo:** confirmada. O primeiro pagamento manual altera `bestRelicsToGet` de zero para a recompensa e recalcula a base passiva.
2. **Duplicação da ressonância:** não ocorreu nos cenários testados. A recompensa manual não contém a ressonância dos nós; a produção por segundo a recebe uma vez. Com a mesma Fé e sem Rito, passar de zero para um nó multiplica a taxa por 4, antes e depois da Transmutação, sem um segundo fator 4.
3. **Recorde anterior preservado indevidamente:** não ocorreu. Cada Ascensão zerou `bestRelicsToGet`, inclusive após carregar o save. Ter Cripta Eterna não preservou esse recorde.
4. **Outra parcela automática creditada pela Transmutação:** não ocorreu. Draupnir e Olho do Infinito usam o valor transmutável da Fé atual; ao gastar toda a Fé, essa parcela cai para zero. Não somam o pagamento manual ao recorde mais de uma vez.

## Por que pode parecer um bug

```text
Ressonância = 4^nós
Transmutação = piso(log2(Fé + 1) × efeito do Rito de Fragmentos)
Base passiva = máximo(1, piso(melhor Transmutação do ciclo / 10))
Fragmentos/s = (Base passiva + parcelas de Draupnir e Olho) × Ressonância
```

Antes da primeira Transmutação manual, o recorde é zero e a base é 1. Um Rito elevado aumenta exponencialmente a recompensa manual e faz a base saltar de uma só vez. Os nós agravam o tamanho absoluto da taxa, embora não sejam aplicados duas vezes.

Exemplos com `1e30` Fé após Ascensão, sem parcelas automáticas:

| Nós | Nível do Rito de Fragmentos | Fragmentos/s antes | Recompensa manual | Fragmentos/s depois | Razão depois/antes |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | 4 | 99 | 36 | 9 |
| 1 | 10 | 4 | 7906 | 3160 | 790 |
| 1 | 50 | 4 | 9715832 | 3886332 | 971583 |
| 20 | 0 | 1.0995116e+12 | 99 | 9.8956046e+12 | 9 |
| 20 | 10 | 1.0995116e+12 | 19220 | 2.1132613e+15 | 1922 |
| 20 | 50 | 1.0995116e+12 | 1.0018656e+08 | 1.1015628e+19 | 10018655 |

## Verificação

A investigação usou uma reprodução mínima seguida de 15 combinações controladas: 0, 1, 4, 10 ou 20 nós e Rito de Fragmentos nos níveis 0, 10 ou 50. Foram comparadas as taxas antes/depois, a fórmula prevista, uma segunda Transmutação de mesmo tamanho, o estado após Ascensão e uma recarga do save. Todos os casos corresponderam à fórmula. Os estados do experimento são preparados diretamente para isolar as variáveis; não representam uma campanha ou garantia de tempo de progressão.

A primeira sondagem detectou o salto (4 → 20), mas sua expectativa de que o acréscimo não ultrapassasse 10% da recompensa era incompatível com a regra documentada de ressonância sobre a produção passiva. A investigação posterior distinguiu esse comportamento previsto de uma duplicação acidental.

Saída detalhada ignorada pelo Git: `reports/transmutation-jump-2026-11-10.json`. Testes permanentes e reproduzíveis:

```bash
nix-shell --run 'npm test -- src/core/transmutationRate.test.ts'
```

Não foi inspecionado um save real do usuário. Se o salto observado exceder os componentes desta fórmula para o mesmo estado, será necessário reproduzir com esse save para identificar outra causa.

Hashes SHA-256 das fontes investigadas:

- `src/core/GameState.ts`: `86861b8d0c77358a667a2af024e9994d66af0fe8a166a592623eb6d7cb02a452`
- `src/systems/calculations.ts`: `d786e26d3d69bb88173d9c37b18782259e3a52c080ed23a64afcd3e4b01bdbc4`
- `src/config/gnose.ts`: `89662e19aaf3461d750539fcc896fbec597752185cca1241d0bf50c0afd8fec4`
