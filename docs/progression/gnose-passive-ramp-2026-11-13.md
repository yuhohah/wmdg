# Bônus permanente da Gnose — 2026-11-13

A curva anterior `1 + 7000 * G^0.35` concedia ×11.372,53 com apenas 4 Gnose total. A nova curva é:

```
M = 1 + 0.5 * sqrt(G) + 7000 * G^0.35 * (G / (G + 1000))^2
```

`G` é a Gnose total obtida, não o saldo. Zero concede ×1; 1 concede ×1,507; 4 concede ×2,1805; 10 concede ×4,1174. Gastar Gnose não reduz o bônus. A fórmula compartilhada alimenta Fé por clique, Fé/s, Fervor/s, tooltips e previsão de Ascensão. Saves existentes recebem o novo cálculo automaticamente, sem modificar moedas, nós ou vitórias.

A raiz dá um benefício inicial moderado. O peso quadrático introduz continuamente a contribuição de campanha: vale cerca de 0,0016% com 4 pontos, 25% com 1.000 e tende a 100%. Não há limiar de desbloqueio nem limite rígido. A curva acelera na transição; não promete retornos marginais decrescentes em toda a faixa. Custos e ganho de Gnose por Ascensão permanecem iguais.

## Validação

Build com `nix-shell --run 'npm run build'`. Conferência manual via módulos reais do jogo: multiplicadores acima, Fé por clique e Fé/s, e compra de Emanação Primordial com total 4 (saldo cai de 4 para 3, total e multiplicador permanecem). Não foram criados testes automatizados.

Benchmark existente, seed 786802, horizonte 24 horas, ausência visible:

| Perfil | Conclusão | Campanha | Tier I / II / III / IV (min) | Ascensões por tier |
| --- | --- | --- | --- | --- |
| Referência | 20 nós, Avatar Solar e chefe final | 10,30 h | 288,3 / 113,8 / 105,7 / 19,9 | 6 / 6 / 4 / 4 |
| Ativo intenso | 20 nós, Avatar Solar e chefe final | 10,10 h | 282,9 / 113,5 / 98,3 / 26,6 | 6 / 6 / 4 / 4 |
| Casual | 20 nós, Avatar Solar e chefe final | 15,46 h | 427,7 / 194,2 / 138,5 / 27,2 | 6 / 6 / 4 / 4 |

A redução torna a reconstrução inicial substancialmente mais lenta. As antigas metas de 20–40 minutos por tier não são atendidas; estes resultados demonstram conclusão sob três políticas, não uma recalibração dessas metas nem garantia para todo jogador. O maior intervalo sem avanço permanente foi 94,7 min na referência. A primeira candidata, com potência deslocada, foi descartada: os três perfis ficaram com 12 nós ao atingir 24 horas.

Reprodução:

```bash
nix-shell --run 'SCENARIOS=reference,intense,casual node scripts/calibrate-progression.mjs reports/gnose-ramped.json 1 final 24'
```

O JSON ignorado pelo Git registra parâmetros, custos, hashes e resultados completos.
