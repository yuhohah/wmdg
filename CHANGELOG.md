# Changelog

Novidades de *Cult of the Sphere*, da versão mais recente para a mais antiga.

## 0.15.0 — 2026-11-26

### Árvore da Gnose e Progressão

- Culto Autônomo e Ruptura Automática foram unificados em Culto e Ruptura Autônomos no Tier I (custo 6 de Gnose).
- Liturgia Autônoma e Oficina Autônoma foram unificadas em Liturgia e Oficina Autônomas no Tier II (custo 30 de Gnose).
- Relíquias Ilimitadas foi separada para o Tier I (custo 10 de Gnose), removendo o teto de nível da Cornucópia e da Tocha com escalonamento de custo de +15% após o nível 20; Cripta Eterna (Tier II, custo 25 de Gnose) passa a focar em preservar 100% das relíquias com limite e 50% de Cornucópia e Tocha na Ascensão.
- Chama Astral (custo 4) e Alquimia Astral (custo 8) foram movidas para o Tier I, rebalanceadas com descrições mais claras de seus efeitos no Fervor, na Transmutação e no Rito da Encarnação, com reembolso automático da diferença de Gnose para saves antigos.
- Escala de sinergia de Fiéis rebalanceada entre os tiers: Emanação Primordial (1 + 0,025 × √Fiéis), Congregação Esférica (1 + √Fiéis) e Coro Harmônico (1 + Fiéis).
- Vigília Perpétua agora mantém a Bênção permanente e também evolui a Encarnação automaticamente a cada segundo, com opção de pausar a Auto-Evolução no painel da Encarnação.

### Combate, Animações e Cerimônia Final

- Adicionadas animações completas de sprite para Fiéis (repouso, caminhada frontal/traseira, levantar e rezar em loop), Encarnação (repouso, canalização e caminhada direcional) e Chefes (repouso animado, reação de dano e reverência).
- Cerimônia final atualizada com movimentação direcional dos Fiéis, animações da Encarnação Solar e reverência dos guardiões e do Demiurgo.
- Adicionado atalho na tecla Espaço para atacar o chefe durante batalhas, além dos botões Pular procissão e Pular automático nas entradas e retornos dos duelos.
- Rebalanceado o dano sofrido na Esfera ao errar mecânicas especiais dos chefes.
- Corrigida a mecânica especial Corvo de Odin: o botão de aparo agora permanece corretamente posicionado no card e o final da janela verde não pisca em vermelho nem registra clique adiantado por engano.

### Conquistas e Salvamento

- Ganhos de clique das conquistas foram redistribuídos ao longo dos marcos, adicionando bônus de base e sinergia de porcentagem da Fé/s por clique.
- Recompensas de Milagres passam a escalar progressivamente com as conquistas de Fiéis (de 10s até 40s de Fé/s).
- Adicionada verificação de assinatura de integridade ao sistema de salvamento.

### Interface, Tabuleiro e Mobile

- Relíquias Divinas agora recolhe automaticamente as relíquias com limite em uma seção expansível assim que Relíquias Ilimitadas é comprada, mantendo Cornucópia e Tocha sempre visíveis.
- Corrigida a trepidação de layout nos cards de Relíquias Divinas (com exibição de atalhos ativada) e de Gnose (quando o ganho de Ascensão muda de 9 para 10 ou entra em notação científica).
- Corrigidas sobreposições de interface no celular em cards, HUD, árvore da Gnose, modais e batalhas de chefe, mantendo também a tela inicial, o foco da câmera e os balões de tutorial abaixo dos contadores do topo.
- Cabeçalhos arrastáveis agora exibem alça visual, o tutorial Monte seu quadro ensina a organizar os cards diretamente no tabuleiro e a ajuda de atalhos ganhou o grupo Quadro.
- A câmera retorna à posição anterior do jogador ao concluir sequências de tutorial, e pular a introdução da Esfera avança para a conversão do primeiro Fiel exibindo quanta Fé falta.

## 0.14.0 — 2026-11-18

### Maldição dos Guardiões

- Perder para um chefe a partir de Hades (Hades, Odin, Caos Primordial e Demiurgo) aplica 1 acúmulo da Maldição dos Guardiões, até o máximo de 5 acúmulos.
- Cada acúmulo reduz em 10% o dano causado aos chefes (até −50%) e aumenta em 60% o dano sofrido ao errar um aparo (até +300%, destruindo a Esfera instantaneamente caso erre um aparo no acúmulo máximo).
- Combates sob maldição ganham regras próprias: os chefes atacam até 25% mais rápido, a coleta automática de milagres durante o duelo fica suspensa e cada aparo concluído dispara um Riposte Gnóstico que causa dano direto à vida do chefe de acordo com o combo.
- Para remover a maldição, derrote o chefe imediatamente anterior pelo botão de purificação na aba Gnose (ou vença o próprio chefe amaldiçoado).
- Aparar ataques não cura mais a integridade da Esfera.

### Mecânicas de Aparo dos Chefes

- Melhorada a visibilidade das mecânicas únicas de aparo com linhas guias no mundo, indicadores de sequência e avisos visuais mais nítidos.
- Balança de Anúbis ajustada com pesos de dois dígitos próximos e posições imprevisíveis, destacando o prato restante como armadilha após escolher o maior peso.
- Grilhões de Hades ganham elos numerados com cadeado nos elos travados, trilha indicando a ordem correta (2 elos nas Fases I–II e 3 elos na Fase III) e recuo ao clicar fora de sequência.
- Corvo de Odin recebe aviso âmbar antes da zona verde e janela de reação rebalanceada.
- Colapso de Caos Primordial destaca o anel orbital entre os 3 selos e exibe quantos selos restam.
- Ritual Sol e Lua do Demiurgo ganha mostrador ampliado com trilha do ponteiro, destaque ao cruzar o centro verde e animação com feixe de luz de cura sempre que o clique cai no lado da Lua.

### Demiurgo, Esfera e Final da Campanha

- Animação do Demiurgo reformulada com rastejar mais fluido e natural entre os recursos do topo.
- Nova visualização de drenagem com feixe de sifão e partículas fluindo do recurso até o orbe do Demiurgo.
- Saída suave ao ser desafiado: o Demiurgo rompe a drenagem e desliza em curva até a arena enquanto a câmera acompanha sua chegada à Esfera.
- Cerimônia de finalização do jogo reformulada com estética hermética, anéis armilares em rotação ao redor da Esfera, feixes de tributo e a presença do Demiurgo curvando seu cetro ao lado dos quatro guardiões, do Avatar Solar e dos fiéis.
- Animação do Satélite da Gnose (Autoclicker) reformulada com órbita kepleriana contínua, anéis armilares giratórios, rastro luminoso, arco de choque e faíscas no ponto de impacto com a Esfera, além de segundo satélite antipodal alternando golpes ao alcançar 2 cliques/s.

### Conquistas e Atalhos

- Adicionada a tecla . como atalho para comprar diretamente o desbloqueio de mecânica atual.
- Novas conquistas de Provação Amaldiçoada por subjugar Hades, Odin, Caos Primordial e o Demiurgo sob a Maldição máxima (5/5 acúmulos).
- Novos ícones em estilo de gravura hermética para todas as famílias de conquistas, incluindo medalhões com retratos e selos de cinco espinhos para as provações amaldiçoadas.
- Todas as 40 conquistas agora concedem bônus permanentes harmonizados por família: Fé por clique em Fé acumulada, Fé dos fiéis distribuída entre Congregação e Produção, aceleração do Autoclicker nos Tiers II e III da Gnose, Fé global nos Guardiões e no Tier IV da Gnose, e bônus de crítico, desconto de fiéis e Fé global nas Provações Amaldiçoadas.

### Configurações e Desempenho

- Adicionado seletor de taxa de quadros nas Configurações (30 FPS por padrão ou 60 FPS), aplicado em tempo real a todas as animações do jogo sem alterar a velocidade de progressão.
- Menu de Configurações reorganizado em 5 seções visuais: Áudio e Resposta Tátil, Desempenho e Vídeo, Interface e Orientações, Progresso e Salvamento, e Sistema e Histórico.
- Otimizadas as atualizações de interface nos painéis de Fervor e Relíquias, cálculo de compra máxima, dicas de fórmulas, barra de recursos, guia inicial e movimentação da câmera no tabuleiro.

## 0.13.0 — 2026-11-14

### Demiurgo

- Novo boss final: o Demiurgo aparece após derrotar Caos Primordial e comprar todas as melhorias da Gnose, com um aviso para o jogador.
- O Demiurgo percorre os recursos do topo, da Fé à Gnose. Ao parar ao lado de cada recurso, drena o saldo e reduz sua geração por segundo até zero em até 4 segundos. Se a Gnose zerar, a partida termina em derrota.
- Clicar no Demiurgo interrompe sua caminhada pelos recursos e o leva até a Esfera, iniciando a procissão dos Fiéis e uma batalha com as regras dos demais bosses. A vitória restaura a produção e passa a ser necessária para concluir a campanha.
- Adicionado o botão Redesafiar o Demiurgo após sua aparição, também disponível para revanche após a vitória.
- Novas animações de caminhada, arremesso da esfera, ritual com o cajado erguido com e sem luz mística, e derrota.

### Combate

- O ritual Sol e Lua do Demiurgo ganha um arco com ponteiro que faz duas idas e voltas em ritmo irregular. Acerte a pequena faixa verde central para aparar.
- Errar para o lado da Lua cura o Demiurgo e mostra o ritual com luz; errar para o lado do Sol causa dano à Esfera e mostra o ritual sem luz. Quanto mais longe do centro, maior a porcentagem, até 40%. Deixar o tempo acabar aplica a cura máxima ao boss.
- O segundo ataque de Odin usa um círculo de contorno vermelho que encolhe até ficar verde. Tocar antes ou deixar o tempo acabar causa erro; acertar no verde apara o corvo e atrasa o próximo ataque.
- O círculo de Odin fica em um card com instruções e os avisos Aguarde e Apare agora. O card aparece acima da Esfera ou ao lado em telas horizontais mais baixas, com alvo verde maior para facilitar o toque no celular.

### Menu de desenvolvimento

- Adicionado o botão Abrir menu dev nas Configurações e melhorada a posição e a identificação do botão DEV no celular.
- Corrigida a detecção do modo de desenvolvimento ao acessar o jogo pela rede local ou por endereços do Tailscale.

## 0.12.2 — 2026-11-13

### Progressão e Gnose

- Emanação Primordial passa para o Tier II e Convergência dos Fiéis para o Tier III.
- Custos da árvore da Gnose ajustados para a nova ordem dos tiers, organizando as melhorias em grupos de preço próximos para permitir escolhas em cada etapa.
- Cripta Eterna preserva as Relíquias com limite, torna Cornucópia e Tocha sem limite de nível e mantém 50% delas a cada Ascensão.
- Nova melhoria Memória do Opus no Tier III: preserva mais 30% das Relíquias sem limite, mantendo 80% dos níveis de Cornucópia e Tocha na Ascensão.

### Automações

- Culto Autônomo passa a comprar Fiéis automaticamente usando o Converter Máximo.
- Liturgia Autônoma e Oficina Autônoma respeitam a opção Compra máxima de cada painel, comprando 1 nível quando desativada ou o máximo disponível quando ativada.

## 0.12.1 — 2026-11-12

### Progressão

- Custos e bônus da Gnose ajustados para uma progressão mais equilibrada, com menos dependências entre melhorias.
- Cada etapa da Gnose foi ajustada para cerca de 20–40 minutos de jogo ativo e 4–12 Ascensões. O próximo Guardião exige completar a etapa anterior.
- Removido o bônus geral de 4× por melhoria da Gnose. Continuam valendo os efeitos de cada melhoria e o bônus pela Gnose total obtida.
- Olho do Infinito passa a ser a última recompensa da árvore.
- Partidas antigas mantêm suas melhorias e recebem de volta a diferença dos preços reduzidos, uma única vez.

### Combate

- Removido o Fulgor Divino. Aparar continua bloqueando golpes, e os milagres recuperam a proteção da Esfera.

### Interface e atalhos

- As teclas de 1 a 6 levam aos painéis do jogo.
- Botões mostram suas teclas de atalho. É possível ocultá-las nas Configurações.
- O painel dos Fiéis brilha enquanto há um milagre disponível.

## 0.12.0 — 2026-11-12

### Desempenho

- Esfera, batalhas e Fiéis usam menos memória e processamento.
- Animações e efeitos fora da tela fazem menos trabalho.
- Reduzidos os efeitos de desfoque e o peso das imagens baixadas.

### Correções

- A Esfera volta a girar corretamente durante os combates.
- Restaurados os retratos dos Guardiões nas conquistas.
- Melhoradas a atualização das conquistas e das fórmulas do modo Nerds.

## 0.11.0 — 2026-11-12

### Conquistas

- As 36 conquistas agora aparecem em uma grade por categoria, com ícones e detalhes ao selecionar.

### Modo Nerds

- Fórmulas mais legíveis, com valores atuais e comparação com a próxima melhoria.
- Adicionadas fórmulas de Transmutação, Ascensão, Bênção e recursos do topo.

## 0.10.1 — 2026-11-12

### Compras e progressão

- Memória Hermética libera a opção de comprar o máximo de Ritos e Relíquias. A escolha fica salva em cada painel.
- Vigília Perpétua mantém a barra de Bênção cheia.
- Partidas novas começam com 0 Fé.
- Relíquias voltam à ordem de preço. Com Cripta Eterna, as relíquias com limite ficam em uma seção recolhível.

### Interface

- Melhorados os textos, fontes e alinhamento dos painéis de Fiéis, Encarnação e Fervor.
- Fiéis e Encarnação ficam sempre expandidos. Apenas Relíquias se recolhe ao concluir todas as melhorias e reabre após a Ascensão.
- O resumo dos ganhos durante ausências ficou mais fácil de ler.
- A tela inicial mostra a forma atual da Esfera e explica como mover os painéis.
- Barras de rolagem adaptadas ao visual do jogo.

### Tutoriais

- Configurações permitem ocultar ou rever as orientações sem perder progresso.
- Textos iniciais mais curtos e corrigida a primeira dica, que às vezes não aparecia.
- A orientação sobre Guardiões aparece quando Anúbis pode ser desafiado.

## 0.10.0 — 2026-11-11

### Final da campanha

- Novo ritual de encerramento com a Esfera, Avatar Solar, Fiéis e Guardiões.
- Após concluir, é possível continuar em jogo livre, consultar recordes locais ou rever o ritual.
- A conclusão exige Avatar Solar e vitória sobre Caos Primordial. O ritual pode ser pulado pelo botão ou por Esc.
- Status do Culto passa a mostrar o tempo total da partida, incluindo ausências e Ascensões.

### Progressão e compras

- Avatar Solar deixa de exigir Gnosis Suprema: basta ter Avatar do Eclipse e 1e30 Fé.
- Cripta Eterna preserva todas as Relíquias e libera níveis ilimitados para Cornucópia e Tocha. Após o nível 20, cada nível custa 15% a mais.
- Melhorias da Gnose reorganizadas, com preços menores e devolução da diferença para partidas compatíveis.
- O primeiro desafio de Anúbis passa a exigir três melhorias da Gnose.
- Compras máximas mostram a quantidade disponível. Ritos também mostram o efeito do próximo nível.
- Críticos da Esfera são liberados aos 250 cliques, com 5% de chance, e chegam a 10% aos 1.000 cliques.

### Interface e atalhos

- Números seguem o padrão brasileiro, com K, M, B e T; a notação científica começa em 1e15.
- Espaço clica na Esfera; Caps Lock faz Transmutação; Z/X compram Fiéis; M coleta milagres; I/U controlam Bênção e evolução.
- Ritos usam QWERTY e Relíquias usam ASDFGH. A ajuda de atalhos fica no canto inferior esquerdo; o menu de desenvolvimento usa F2.
- Textos, tutoriais e explicações de recursos revisados. O Fervor aparece no topo ao liberar a Encarnação.

### Desempenho e segurança do progresso

- Menos travamentos ao retornar de uma ausência e menor uso de memória nas batalhas.
- Importações são verificadas antes de substituir a partida. Um backup válido pode recuperar um save danificado.
- Esc fecha confirmações abertas sem abandonar o combate.

## 0.9.1 — 2026-11-06

### Progressão

- Preços da Gnose reduzidos, principalmente nas melhorias mais caras. Automações ficam acessíveis mais cedo.
- Cada clique na Encarnação acrescenta 3 segundos de Bênção, até o limite de 60 segundos.

### Visual e áudio

- Guardiões ganham animações de derrota, e os Fiéis retornam ao pátio após a vitória.
- Formas e giros da Esfera revisados, com transições mais suaves.
- Áudio separado em volume geral, música e efeitos, com opção de silenciar cada um. Efeitos sonoros ficam mais audíveis.
- Recursos e custos passam a usar notação científica.

### Desempenho

- Carregamento mais rápido e batalhas mais fluidas, especialmente no celular.

## 0.9.0 — 2026-11-06

### Combate

- Menus ficam ocultos durante as lutas e retornam ao final.
- Botões de aparar ficam ao redor da Esfera, sem cobrir o Guardião ou as barras de vida.
- A balança de Anúbis ganha o botão PESAR: escolha o maior peso.
- Barras mostram o dano recente; números de dano e textos ficam mais legíveis.

### Interface e orientações

- Gnose mostra quanto falta para o próximo ganho e explica melhor cada melhoria.
- Ascensão pede confirmação apenas na primeira vez, com opção de reativá-la.
- Tutoriais e notificações mais claros, com menos avisos repetidos.
- Quadro ampliado para acomodar painéis compridos e novos controles de áudio.

### Correções

- Desbloqueios reaparece imediatamente após a Ascensão.
- Removido o destaque azul ao tocar em botões e na Esfera no celular.

## 0.8.1 — 2026-11-04

### Visual

- A Esfera ganha cinco formas animadas que acompanham a Encarnação e o progresso salvo.
- A preferência por movimento reduzido usa imagens estáticas.
- Após a vitória, o Guardião desaparece e a Encarnação conduz os Fiéis de volta ao pátio.

### Combate

- Aparar bloqueia o golpe sem causar dano aos combatentes e mantém a carga de 25% da Esfera.
- Na balança de Anúbis, escolha apenas o maior número. Escolhas erradas aumentam o dano recebido.

### Interface

- Relíquias, Encarnação e Gnose se recolhem ao concluir todas as melhorias e podem ser reabertas.

## 0.8.0 — 2026-11-04

### Combate

- A preparação considera Fé, Fiéis, Fervor, Relíquias, Encarnação e Gnose. A interface indica o que fortalecer.
- Abaixo de 60% de prontidão, o culto não causa dano. Abaixo de 80%, um golpe não aparado destrói a proteção da Esfera.
- Cada Guardião ganha ataques especiais, e as mudanças de fase ficam mais perigosas.
- Relembrar Duelo permite buscar um tempo melhor sem repetir recompensas nem sofrer maldição na derrota.

### Interface e progressão

- Novidades aparecem após atualizar o jogo e podem ser revistas nas Configurações.
- Recursos do topo ganham dicas; tutoriais explicam melhor Bênção, milagres, Transmutação e Guardiões.
- Preços altos de Gnose ficam mais fáceis de ler.
- Transmutação passa a acontecer sem confirmação extra.

### Áudio e visual

- Nova música ambiente e trilha própria para batalhas.
- Relíquias Divinas ganha seu nome atual, e a Esfera vira o ícone da aba do navegador.

## 0.7.8 — 2026-11-03

### Combate

- Guardiões atacam mais rápido, dão menos tempo para aparar e punem mais os erros.
- Dano ajustado para prolongar os confrontos.
- Corrigida a interrupção da animação ao aparar um golpe.

### Visual

- Câmera acompanha melhor a preparação, o combate e o retorno ao tabuleiro.
- Caos Primordial ganha novas animações de levitação e ataques à distância.

## 0.7.7 — 2026-11-03

### Combate

- Batalhas passam a acontecer no próprio tabuleiro.
- Encarnação e Fiéis formam um círculo antes da chegada do Guardião, mesmo com os altares em outras posições.
- A área de clique acompanha os movimentos do Guardião.

### Visual e personagens

- Nova arte da Esfera em camadas.
- Hades substitui Cronos como segundo Guardião.

## 0.7.6 — 2026-11-02

### Visual

- Esfera, Fiéis e Encarnação ganham novas artes e animações em pixel art.
- A aparência dos personagens acompanha sua evolução.

## 0.7.5 — 2026-10-30

### Atualização geral

- Reunidas as melhorias visuais do santuário, de progressão, dos tutoriais e do Status do Culto.
- Esta versão reúne as mudanças anteriores, sem novidades adicionais.

## 0.7.4 — 2026-10-30

### Interface

- Clicar no nome do jogo abre o Status do Culto, com estatísticas atualizadas.
- O painel também funciona no celular e pode ser fechado por Esc ou ao clicar fora.

## 0.7.3 — 2026-10-30

### Interface e tutoriais

- Tabuleiro maior, painéis compactos e textos revisados. Painéis podem ser movidos e recolhidos.
- Tutoriais aparecem conforme os sistemas são liberados, sem repetir avisos de Transmutação já vistos.
- Modo Nerds permite consultar fórmulas pela interface.

### Automações e desempenho

- Automações deixam de reservar recursos para compras futuras.
- Animações e efeitos passam a ter limite de 30 quadros por segundo para deixar o jogo mais leve.

## 0.7.2 — 2026-10-29

### Progressão

- Revistos os custos da Gnose, ganhos de Ascensão e evolução dos Avatares. Cada melhoria da Gnose passa a multiplicar a produção por 4.
- Gastar Fervor ou Fragmentos não reduz mais a força de produção alcançada no ciclo. Esse bônus reinicia na Ascensão.
- Bênção acumula 10 segundos por uso, até um minuto. Avatar Solar passa a exigir Gnosis Suprema.
- Milagres passam a recompensar produção e poder dos cliques, em vez da Fé guardada.
- Selo da Gnose deixa de consumir Fé ao ser aberto.

### Automações e progresso salvo

- Automações de Fiéis, Ritos e Relíquias ganham controles separados e passam a reservar recursos para objetivos futuros.
- Ganhos durante ausências ficam limitados a 24 horas.
- Partidas antigas mantêm compras e recebem devoluções de preços quando aplicável.

## 0.7.1 — 2026-10-28

### Interface

- Removidos títulos repetidos dos painéis, da Encarnação e das melhorias da Gnose.

## 0.7.0 — 2026-10-28

### Combate

- A preparação para cada Guardião passa a considerar todo o culto, com pressão contínua sobre o altar e bônus por aparadas seguidas.
- Guardiões dos Tiers III e IV exigem duas melhorias do tier anterior. A interface mostra requisitos e duração estimada da luta.
- Caos Primordial substitui Tiamat, preservando vitórias e recompensas antigas.

### Visual

- Novos fundos para o Pátio dos Fiéis e o altar da Encarnação.
