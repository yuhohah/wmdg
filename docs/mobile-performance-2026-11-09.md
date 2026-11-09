# Verificação de desempenho móvel — 09/11/2026

## Parecer

O jogo apresentou desempenho aceitável no teste local de produção, mas ainda não está validado em celulares fracos. O santuário manteve aproximadamente 60 FPS na repetição sem transmissão da prévia. A entrada no combate teve uma pausa perceptível. O risco principal é a combinação de renderização contínua, efeitos e transições em hardware com menos capacidade, além do peso da música em redes lentas.

Não foi alterado código de execução nesta avaliação.

## Método e limites

- Build `npm run build`, servido por `vite preview`, sem o custo do servidor de desenvolvimento. Base Git `a9898dc`, com as mudanças locais de esferas, áudio e Bênção.
- Chromium 154 em Linux, janela de 390 × 844, DPR 2, navegador de computador com 12 processadores lógicos disponíveis. Isso muda o layout e a resolução dos canvases, mas não emula CPU, GPU, RAM ou aquecimento de um telefone.
- Medições de 4–8 segundos por cenário: intervalos de `requestAnimationFrame`, tarefas acima de 50 ms e duração síncrona do desenho da esfera. Clique programático no botão, oito vezes por segundo; não mede a latência real do toque até a apresentação na tela.
- Instrumentação temporária feita somente na aba isolada do navegador. Preferências e progresso foram alterados nessa aba de teste.
- A prévia inicialmente transmitida apresentou 24–32 FPS. A repetição sem essa transmissão apresentou 60 FPS, inclusive no mesmo jogo. As primeiras amostras ficam no JSON por transparência, mas não sustentam uma classificação de baixa performance do jogo.
- O custo síncrono de Canvas mede a preparação/envio dos comandos; não inclui toda a rasterização e composição posterior da GPU.
- Sem limitação de CPU/GPU: não houve teste de aparelho fraco nem simulação calibrada de um. Sem rede móvel limitada: os tempos de carregamento locais não representam 3G/4G.
- O navegador retornou heap arredondado em 10 MB em todas as amostras. Esse número não permite avaliar memória real nem vazamentos. As amostras curtas também não avaliam aquecimento ou bateria.

## Resultados aproveitáveis

- Documento de texto, sem jogo: 60,0 FPS; intervalo p95 de 16,8 ms.
- Plenitude parada, repetição sem transmissão: 60,0 FPS; zero intervalos acima de 33 ms e zero tarefas longas. Desenho da esfera: média de 0,90 ms, p95 de 1,10 ms.
- Plenitude com oito cliques/s durante seis segundos: 60,0 FPS; zero intervalos acima de 33 ms e zero tarefas longas. Desenho: média de 0,94 ms, p95 de 1,30 ms. Tratamento de clique: média de 0,81 ms, p95 de 1,10 ms.
- Início do encontro de Anúbis/procissão, repetição sem transmissão: 51,8 FPS em seis segundos, uma tarefa longa de 88 ms e maior intervalo entre quadros de 116,6 ms. Essa amostra contém a transição e não é uma medição de combate estabilizado, de todos os chefes ou de suas fases especiais.
- Desenho isolado do pátio com 60 sprites, 120 chamadas: média de 0,18 ms, p95 de 0,30 ms. O cenário de câmera do pátio permaneceu fora da tela, portanto seu FPS não foi usado como resultado de pátio visível. O teste isolado não substitui medir o pátio completo em movimento.

## Carregamento e memória de recursos

- JavaScript principal: aproximadamente 329 kB sem compressão, 94 kB comprimidos. CSS: 194 kB sem compressão, 38 kB comprimidos.
- Recursos concluídos antes da interação inicial: aproximadamente 665 kB, incluindo fonte, sprites e esfera. Não inclui a música que começa após a interação, recursos ainda em transferência, cabeçalhos ou recursos futuros. Não é o total de uma sessão completa.
- Diretório publicado: aproximadamente 51,3 MB. Isso não significa baixar 51,3 MB ao abrir o jogo.
- Música de fundo: 18,1 MB; música de combate: 2,8 MB. Ambas usam `preload='none'` e começam sob demanda. São candidatas a reduzir o consumo de dados, não evidência de uso equivalente de RAM.
- Dois SVGs antigos de Órbitas, sem uso na renderização atual: 17,6 MB combinados em `assets/sphere/orbitas-vector/`. O filtro do build ainda os inclui. Eles pesam na publicação, mas não apareceram no carregamento inicial medido.
- Nove spritesheets compartilhadas dos Fiéis: cerca de 3,3 MB em RGBA, estimativa por dimensões, sem contar caches/cópias do navegador.
- Canvases normais observados: esfera 512 × 512, pátio 692 × 480 e Encarnação 692 × 296; somam aproximadamente 3,2 MB em uma cópia RGBA. Não é uma estimativa de RAM total: faltam buffers, imagens fora do DOM, áudio, superfícies de composição e canvas de combate ativo.

## Proteções já presentes

- Simulação principal a 10 Hz e atualização de painéis limitada aos que estão visíveis.
- Fiéis limitados a 60 sprites; imagens compartilhadas.
- Fiéis e Encarnação com limite visual de 30 Hz e DPR limitado a 2.
- Desenhos fora da tela suspensos; loops decorativos antigos usam temporizadores mais lentos fora da tela. A esfera suspende RAF quando sai da tela, com a aba oculta ou com movimento reduzido.
- Vários filtros e desfoques dos cartões já foram removidos. Música carregada sob demanda.

## Prioridades para celulares fracos

1. Investigar a pausa na entrada do combate com um perfil de CPU/rasterização; verificar carregamento/decodificação das imagens e mudanças de layout da procissão antes de atribuir a causa.
2. Colocar a nova esfera no mesmo orçamento de 30 Hz das demais animações. Atualmente ela executa a cada RAF: quatro aros geram 384 segmentos, 1.164 avaliações de ponto e milhares de pequenas alocações por desenho. Considerar reutilizar buffers, reduzir segmentos conforme o tamanho exibido e pré-calcular valores constantes. Os tempos locais não mostram um gargalo grave de JavaScript, mas esse é um custo contínuo evitável em bateria/CPU.
3. Excluir do build os SVGs antigos não usados e revisar o tamanho das faixas de áudio. São melhorias de publicação/download; não prometer ganho de FPS só por remover arquivos não carregados.
4. Medir em Android de entrada real por pelo menos 10–15 minutos: santuário com cliques, pátio visível com 60 sprites, pan/zoom, procissão e cada combate. Buscar 30 FPS sustentados, boa resposta ao toque e ausência de travamentos recorrentes, monitorando RAM e aquecimento. O teste atual não certifica esses critérios.

Dados completos: [mobile-performance-2026-11-09.json](mobile-performance-2026-11-09.json).
