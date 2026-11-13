# Prontidão por Gnose total — 2026-11-13

Prontidão, mitigação de ataques e pressão dependem exclusivamente da Gnose total adquirida. O saldo disponível, os nós comprados e os demais recursos não entram nessas fórmulas. Os recursos continuam contribuindo para o dano ofensivo. Nenhum dado persistido ou vitória é removido.

A curva é `min(2, base + (1-base)*ln(1+G)/ln(1+referência))`. Anúbis usa base 0,6 e referência 4; Hades, Odin e Caos usam base zero e referências 30, 450 e 500.000. As referências posteriores acompanham aproximadamente o custo acumulado dos tiers anteriores. São pontos de 100% de prontidão, não cobranças nem novas exigências de entrada.

Anúbis com zero Gnose permanece em 60% de prontidão: pode receber dano, mas qualquer ataque perdido retira 100 pontos de integridade. Selecionar o peso menor ou ambos os pesos também é fatal. A pressão base passa a 0,08 ponto/s; sai a regra que provocava colapso automático em poucos segundos. As transições de fase mantêm o dano de 15 e 30 pontos. A partir de 2 Gnose, a prontidão supera 80% e começa a permitir erros; 4 Gnose alcançam 100%.

## Conferência do combate real

Execução temporária com GameStateManager, tickBossBattle e ações reais; passo de 0,05 s, sem críticos, até duas interações/s compartilhadas entre cliques, aparadas e milagres. Não foram adicionados testes automatizados ao projeto.

- Estado mínimo: Selo da Gnose aberto, 1e15 de Fé, zero Gnose, sem Fiéis, Avatar básico e sem upgrades. Execução perfeita venceu em 561,35 s, com cerca de 10 pontos de integridade restantes.
- Culto inicial desenvolvido: 120 Fiéis, Avatar II, 1e7 Fervor, sete níveis em cada Rito e um nível em cada Relíquia, zero Gnose. Execução perfeita venceu em 136,35 s. Essa configuração é uma referência de combate, não uma promessa de tempo para todo jogador.
- Nos dois estados, perder um ataque nas fases I, II ou III, selecionar o peso menor ou clicar em ambos causou derrota. O peso menor ignorado depois da escolha correta expirou sem penalidade.
- Em todos os Guardiões, alterar saldo de Gnose, Fé, Fiéis, Avatar e nós, mantendo Gnose total, preservou prontidão e dano recebido por erro.
- `npm run build` e a conferência de whitespace dos arquivos tocados passaram.

## Campanha

Benchmark existente, seed 786802, horizonte 24 h, ausência visible: referência, ativo intenso e casual concluíram com 20 nós, Avatar Solar e chefe final vencido. Tempos: 9,27 h, 8,98 h e 13,47 h, respectivamente. Uma seed por perfil demonstra viabilidade dessas políticas, sem estabelecer distribuição de dificuldade humana.

O simulador agora permite a tentativa inicial contra Anúbis com prontidão ofensiva. Caso precise de proteção e não exista um nó disponível, pode ascender para acumular Gnose em vez de esperar que produção altere a prontidão. Os tempos antigos de cadência não validam esta configuração; em particular, a métrica histórica do Tier I começa na primeira Ascensão, que pode ocorrer depois de Anúbis, e nesse caso fica sem duração válida.

```bash
nix-shell --run 'SCENARIOS=reference,intense,casual node scripts/calibrate-progression.mjs reports/gnose-boss-readiness-final.json 1 final 24'
```

O relatório local contém parâmetros, hashes e resultados completos.
