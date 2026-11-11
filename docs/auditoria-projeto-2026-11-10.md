# Auditoria do projeto — 10/11/2026

> Atualização após a revisão: os dez achados abaixo foram corrigidos no workspace. As seções de diagnóstico preservam o registro original; a validação das correções está no final deste documento.

Revisão do estado atual do workspace, incluindo alterações locais e arquivos ainda não versionados. Nenhuma correção de execução foi aplicada nesta auditoria. O escopo foi o projeto inteiro, e não uma comparação com um commit. Os eixos Standards e Spec foram revisados independentemente; persistência e segurança receberam verificação adicional.

Prioridades: P1 = tratar primeiro por risco de indisponibilidade/perda de progresso ou bloqueio perceptível; P2 = correção importante; P3 = manutenção. Os achados não significam que esses sintomas ocorram em toda partida.

## Verificações e limites

- `npm run build`: passou, incluindo TypeScript.
- `npm test`: 36 arquivos e 414 testes passaram.
- `npm audit --json`: zero vulnerabilidades reportadas para as dependências instaladas, em 10/11/2026. Isso não certifica a segurança do código/configuração.
- Build principal: JavaScript 341.067 bytes, gzip 98,16 kB; CSS 198.129 bytes, gzip 39,09 kB. `dist/` ocupa aproximadamente 51 MiB em disco.
- Reproduções de saves e simulação offline em Node.js 24.21.0, carregando os módulos reais via Vite SSR. Reproduções de ritual, Escape e simulação offline em aba de navegador de teste. Estado de domínio temporário restaurado após o teste de combate.
- Não foram simulados CPU/GPU de telefone fraco, sessões de horas, todas as combinações econômicas ou condições reais de rede móvel. O teste de carregamento pendente do ritual foi injetado substituindo temporariamente `HTMLImageElement.prototype.decode` por uma Promise que não resolve.
- Referências externas restritas à documentação oficial do Vite. Nenhum segredo ou credencial foi necessário.

## Persistência e segurança — verificação adicional

### S1 · P1 — Save malformado pode impedir a inicialização, apesar de backup válido

Referências: [saveSystem.ts:50](../src/systems/saveSystem.ts#L50), [GameState.ts:1788](../src/core/GameState.ts#L1788), [main.ts:190](../src/main.ts#L190).

`deserialize()` valida apenas a presença de uma versão numérica. Um save com `followers: [null]` é aceito; `applySaveData()` lança `Cannot read properties of null (reading 'id')`. Com esse save na chave principal e um save válido no backup, `load()` retorna o principal e não tenta recuperar o backup, pois considera a desserialização bem-sucedida. A importação ainda grava o candidato antes de tentar aplicá-lo, podendo persistir a falha.

Correção: validar estrutura, versão suportada e elementos de cada coleção; construir um estado candidato antes de substituir o ativo; recuperar o backup quando a validação ou aplicação falhar; não sobrescrever backup válido com dados inválidos. Acrescentar testes reais de importação/restauração malformada.

### S2 · P2 — Valores não finitos contaminam o estado e viram `null` no save

Referência: [GameState.ts:1767](../src/core/GameState.ts#L1767).

Vários campos usam `typeof value === 'number'` sem `Number.isFinite`. Um JSON com `faithPoints: 1e309` produz `Infinity`, é aceito e entra no domínio. Na serialização seguinte o saldo vira `null`. A formatação numérica também exibe valores não finitos como zero, ocultando a origem do problema. Reprodução confirmada com os módulos reais.

Correção: exigir números finitos, inteiros onde necessário e intervalos válidos na fronteira de entrada; proteger também operações econômicas contra overflow. Este teste demonstra corrupção por entrada inválida; não demonstra que uma campanha normal atinja o overflow.

### S3 · P2 — Servidor de desenvolvimento aceita qualquer hostname

Referência: [vite.config.ts:27](../vite.config.ts#L27).

A combinação `host: true` e `allowedHosts: true` expõe o servidor nas interfaces disponíveis e desativa a restrição de hosts. Requisição local com `Host: auditoria.invalid` retornou HTTP 200. A [documentação oficial do Vite](https://vite.dev/config/server-options.html#server-allowedhosts) alerta para leitura de código/conteúdo do servidor via DNS rebinding nessa configuração.

Correção: usar localhost como padrão e lista explícita de hosts para acessos necessários. A explorabilidade depende da rede e do navegador; não foi executado ataque de DNS rebinding. Isso é um risco de desenvolvimento, sem evidência de que a publicação estática tenha a mesma exposição.

## Standards — desempenho, recursos e manutenção

### T1 · P1 — Ganhos offline processados em um único bloco síncrono

Referência: [elapsedTime.ts:35](../src/systems/elapsedTime.ts#L35).

Uma ausência de 24 horas executa aproximadamente 864.000 passos de 0,1 segundo, verificando conquistas após cada passo. Esse processamento ocorre antes de a inicialização ou retorno de visibilidade concluir. Medições locais em uma execução por cenário: 1.771 ms em Node para estado inicial; 3.015 ms em Node para estado com sistemas liberados; 1.604 ms na thread principal do Chromium para estado avançado equivalente. Esses números são amostras, não percentis nem previsão para celulares.

Correção: executar a simulação em Worker ou em lotes com devolução de controle ao navegador, mantendo determinismo, limites e persistência atômica dos ganhos. Mostrar progresso e impedir dupla aplicação enquanto ela ocorre.

### T2 · P2 — Ritual não pode ser pulado enquanto uma imagem permanece pendente

Referência: [EndingRitual.ts:50](../src/features/ending/EndingRitual.ts#L50).

O RAF começa somente após todas as chamadas de `decode()` terminarem. “Pular ritual” e Escape apenas mudam `elapsed`; sem RAF, o callback que apresenta as escolhas nunca roda. Com decode pendente simulado, após pular o estado permaneceu `gathering`, `elapsed = 24` e o card continuou oculto. Uma falha que rejeita rapidamente a Promise é tolerada; o problema é carregamento que permanece pendente.

Correção: permitir que pular/cancelar avance independentemente do preload e estabelecer um prazo para carregamento com fallback visual.

### T3 · P2 — Canvas de batalha cresce com o posicionamento dos cards

Referências: [BossBattleModal.ts:674](../src/features/gnose/BossBattleModal.ts#L674), [BossBattleModal.ts:1427](../src/features/gnose/BossBattleModal.ts#L1427).

A área do canvas inclui as posições do Pátio e da Encarnação, além da arena. Arrastá-los para longe aumenta a superfície alocada. Um canvas de 7.000 × 4.400 pixels equivale a aproximadamente 123 MB decimais por superfície RGBA, antes de buffers adicionais. É uma estimativa por dimensões; não houve medição de RAM/GPU ou demonstração de travamento nesse layout. A redução para 0,6 em telas pequenas ajuda, mas não impõe orçamento máximo.

Correção: limitar pixels de backing store e renderizar a área visível da câmera, separando coordenadas do mundo da resolução da superfície.

### T4 · P2 — Artes arquivadas sem uso entram na publicação

Referência: [shippedAssets.ts:23](../src/config/shippedAssets.ts#L23).

`isShippedAsset()` retorna `true` por padrão fora das exclusões. Os SVGs `assets/sphere/orbitas-vector/aros-animados.svg` e `orbitas-animada.svg`, sem referências no código de execução, somam 17.621.223 bytes e permanecem em `dist/`. O problema é o filtro de publicação; manter os originais no repositório pode ser intencional.

Correção: excluir esse diretório do build e testar a exclusão. Removê-los da publicação reduz o artefato, sem ganho de FPS ou download inicial demonstrado, pois os arquivos não são carregados pelo fluxo atual.

### T5 · P3 — Renderizador antigo sem consumidores

Referência: [pixelArt.ts:1](../src/ui/pixelArt.ts#L1).

Não foram encontrados imports de `src/ui/pixelArt.ts` nem consumidores de `getDevoteeSheet`/`getAvatarArt`; os renderizadores atuais usam spritesheets. A busca por módulos sem consumidores também encontrou `main.ts` e `shippedAssets.ts`, mas ambos têm entradas legítimas no HTML/configuração e foram descartados como falsos positivos.

Correção: remover o renderizador antigo após confirmar que não serve como ferramenta externa, ou movê-lo explicitamente para arquivo histórico. Não há ganho de execução demonstrado; o módulo já não participa do grafo principal.

## Spec — comportamento e aderência ao fluxo documentado

### B1 · P2 — Escape captura uma confirmação e encerra o duelo

Referência: [BossBattleModal.ts:907](../src/features/gnose/BossBattleModal.ts#L907).

O listener de captura de `keydown` considera somente se há combate e se o menu de testes está visível. Ele não respeita um `dialog[open]`. Quando uma confirmação nativa está aberta durante um duelo, Escape chama `retreatBossBattle()`, cancela o comportamento padrão e interrompe propagação; a confirmação permanece aberta.

Reprodução no navegador com revanche real e diálogo nativo de teste: Escape prevenido, duelo fechado, diálogo ainda aberto. O agente de revisão identificou o caminho Configurações → Importar/reset como caso de uso; a reprodução direta isolou a disputa entre os handlers. A semântica do diálogo está documentada no comentário de `CultDialog.ts`: o diálogo nativo cuida do foco e Escape.

Correção: o listener do combate deve deferir para o diálogo que está no topo antes de executar retirada.

### B2 · P2 — Importação aplica ganhos offline sem mostrar o resumo naquele momento

Referência: [main.ts:192](../src/main.ts#L192).

A importação chama `processOfflineGains()`, que guarda `pendingOfflineNotice`, mas não a exibe. O aviso é consumido no botão inicial ou no retorno de visibilidade. Importar durante a partida um save produtivo antigo pode conceder ganhos silenciosamente e deixar um resumo atrasado para uma futura troca de aba. Constatado pelo fluxo do código, sem reprodução completa da importação nesta revisão.

O GDD descreve o resumo após pelo menos um minuto ausente; FormulasJogo §13.2 inclui importação nas operações de crédito offline. Correção: centralizar a apresentação do aviso após concluir a importação e limpar o aviso pendente consumido.

## Melhorias adicionais, sem classificá-las como falhas confirmadas

- A música ambiente tem 18.131.069 bytes e a de combate 2.812.865 bytes. Revisar compressão/codec para redes lentas. Ambas carregam sob demanda; esses bytes não são estimativa de RAM.
- `SphereRenderer.ts` recria e ordena 384 segmentos para quatro aros a cada desenho. O limite de 30 Hz já existe na versão atual; a recomendação antiga de adicioná-lo está superada. Reutilizar buffers ou reduzir geometria conforme o tamanho exibido é uma oportunidade, não um gargalo novo comprovado.
- Os testes atuais passam, mas faltam cobertura das falhas de persistência acima e integração de DOM/carregamento da conclusão. Não foi encontrada configuração de CI no checkout.
- O README ainda anuncia 0.8.0, enquanto package/changelog usam 0.9.1. Atualizar documentação e revisar regras CSS antigas sobrepostas antes de uma limpeza ampla.
- Não foi identificado um caminho de XSS remoto nesta amostra. Há uso de `innerHTML`, mas os textos observados vêm de catálogos internos e valores formatados. Um leaderboard online futuro precisará validar resultados no servidor; o save local é editável e não oferece prova de pontuação.

Contagem independente: Standards, 5 achados (maior prioridade: simulação offline síncrona); Spec, 2 achados (maior impacto observado: Escape encerra o combate sob um diálogo); persistência/segurança, 3 achados (maior prioridade: save inválido impede carregamento). Não é uma certificação exaustiva de ausência de outras falhas.


## Correções aplicadas e verificadas — 10/11/2026

- **S1:** validação estrutural e de versão antes da aplicação/gravação; recuperação do backup para saves malformados; backup existente preservado quando o principal é inválido; importação calculada em estado candidato e confirmada antes de substituir o estado ativo.
- **S2:** valores não finitos, negativos ou fracionários em contadores inteiros são recusados na entrada. A serialização também recusa progresso inválido antes de convertê-lo em JSON.
- **S3:** servidor de desenvolvimento limitado a localhost, com a validação padrão de hosts do Vite. A mesma requisição com `Host: auditoria.invalid` passou de HTTP 200 para **HTTP 403**.
- **T1:** recuperação em lotes com orçamento de aproximadamente 8 ms entre devoluções ao navegador. Os subpassos de 0,1 s, as automações e a Bênção continuam com as mesmas regras. Estado candidato isolado, checkpoint para salvamento durante a recuperação, pausa das interações e serialização dos pedidos de recuperação evitam gravar ganhos parciais ou processar o mesmo intervalo simultaneamente.
- **T2:** carregamento de imagens com prazo de 4 s e uso das imagens disponíveis após esse prazo. Pular durante o preload revela as escolhas imediatamente e cancela a inicialização atrasada do ritual.
- **T3:** canvas de batalha limitado a 4 milhões de pixels no desktop ou 2 milhões em telas pequenas, com lado máximo de 4096 pixels, sem alterar as coordenadas do mundo. Teste com os cards no extremo do tabuleiro verifica o tamanho real alocado.
- **T4:** `assets/sphere/orbitas-vector/` excluído do build e coberto por testes; arquivos de arte originais preservados no repositório. O artefato passou de aproximadamente 51 MiB para 33 MiB em disco.
- **T5:** `src/ui/pixelArt.ts` removido após confirmar a ausência de consumidores. O README também foi atualizado para a versão 0.9.1.
- **B1:** o listener de Escape do combate respeita um diálogo nativo aberto. Teste de regressão verifica que o duelo continua ativo e que o evento não é interceptado nessa condição.
- **B2:** apresentação do resumo centralizada após a importação e o retorno da aba; o aviso é limpo ao ser exibido. O fluxo de importação real foi exercitado no navegador e exibiu o resumo imediatamente.

### Evidência após as correções

- Build TypeScript/Vite passando; suíte completa com **427 testes passando**, incluindo as novas regressões.
- Recuperação de 24 horas em estado avançado no Chromium local: **2.420 ms totais**, com **239 pulsos de timer de 10 ms** durante o cálculo e **25 ms de maior intervalo observado** entre pulsos. Antes, o cálculo síncrono equivalente bloqueou a thread principal por 1.604 ms. As medições são amostras locais; a melhoria demonstrada é responsividade durante o trabalho, não menor tempo total nem certificação de hardware móvel.
- Com `decode()` permanentemente pendente, pular agora retorna `phase = complete`, card visível e canvas liberado.
- Importação válida no navegador: sucesso, ganhos creditados, resumo mostrado, aviso pendente limpo e diálogo de recuperação encerrado.
- Importação malformada recusada. Falha de gravação injetada: operação recusada, saldo anterior e conteúdo persistido preservados.
- As observações adicionais de compressão de áudio, geometria da Esfera e CI continuam sendo oportunidades separadas; esta rodada trata os dez achados classificados na auditoria.
