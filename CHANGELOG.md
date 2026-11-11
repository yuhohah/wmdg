# Changelog

Histórico de mudanças de *Cult of the Sphere*, em ordem da versão mais recente para a mais antiga.

A versão atual é **0.10.0**. A numeração anterior foi atribuída retrospectivamente aos últimos dez commits: o mais antigo corresponde à 0.7.0, os oito seguintes vão de 0.7.1 a 0.7.8 e o mais recente inicia a 0.8.0. As datas anteriores são as dos commits de referência, não datas de publicação. A 0.8.0 também reúne as mudanças locais mais recentes.

Para as próximas versões, usamos `MAJOR.MINOR.PATCH`: novidades e mudanças relevantes de jogabilidade avançam o número do meio; correções e ajustes menores avançam o último. Enquanto o jogo estiver em desenvolvimento, o primeiro número permanece em zero. Cada nova versão deve atualizar este arquivo, `package.json` e a versão do projeto em `package-lock.json`.

## 0.10.0 — 2026-11-11

- A conclusão da campanha ganhou um ritual com a Esfera final, o Avatar Solar, os Fiéis e os quatro Guardiões. Após os agradecimentos ao jogador e à equipe, todos desaparecem e surge o card **JOGO LIVRE? (LEADERBOARD)**, com recordes locais e opção de continuar ou rever o ritual. A conclusão exige Avatar Solar e vitória sobre Caos Primordial.
- O botão de pular o ritual e a tecla Esc funcionam mesmo durante o carregamento das imagens; a espera pelas imagens também tem limite de tempo.
- O Status do Culto mostra o tempo total desde o primeiro início do jogo, em horas, minutos e segundos, incluindo ausências e preservando a contagem nas Ascensões. Saves antigos começam a contagem a partir da atualização.
- Os botões de compra máxima de Fiéis, Ritos e Relíquias mostram entre parênteses a quantidade que será comprada, atualizada conforme o saldo e os limites disponíveis.
- A recuperação de produção durante ausências passou a executar em lotes, cedendo tempo ao navegador para reduzir travamentos ao abrir ou retomar o jogo. A importação mostra imediatamente o resumo dos ganhos de ausência quando aplicável.
- Saves e importações recebem validação de estrutura e valores numéricos. Um backup válido pode recuperar um save principal inválido, e a importação só substitui o estado atual após validar e salvar os dados.
- O canvas das batalhas passou a limitar sua resolução e ajustar a escala ao espaço ocupado pelos personagens, reduzindo o consumo de memória ao mover os cartões pelo quadro.
- Esc respeita confirmações abertas de importação e reinício durante batalhas, sem recuar do duelo ao tentar fechar a confirmação.
- O servidor de desenvolvimento passou a aceitar localhost por padrão e validar os hosts. As artes vetoriais arquivadas em `sphere/orbitas-vector/` deixaram de entrar na publicação, e o renderizador antigo sem uso foi removido.
- O primeiro desafio contra Anúbis agora exige pelo menos três nós de Gnose assimilados; a Câmara mostra o progresso desse requisito.
- Caps Lock agora transmuta Fé em Fragmentos, respeitando o desbloqueio das Relíquias e o cooldown. O atalho aparece no grupo Relíquias da ajuda de teclado.
- O Fervor aparece no topo assim que a Encarnação é liberada. A ajuda de teclado agora agrupa Esfera, Fiéis, Encarnação, Ritos e Relíquias, com os atalhos de upgrades recolhidos em listas expansíveis.
- Os atalhos agora ficam em um botão no canto inferior esquerdo: passe o mouse ou clique para consultar. As letras saíram dos cartões de Ritos e Relíquias.
- Novos atalhos: Z/X para Fiéis, QWERTY para Ritos, ASDFGH para Relíquias, M para milagres e I/U para Bênção e evolução da Encarnação. O mapa pode ser consultado pelo botão Atalhos. O menu de desenvolvimento usa somente F2 para liberar T aos Ritos.
- A tecla Espaço também toca a Esfera, com os mesmos ganhos, críticos e efeitos do clique. O atalho respeita menus e campos de texto.
- O crítico 2× da Esfera desbloqueia aos 250 cliques com 5% de chance e melhora para 10% aos 1.000. Cadência Devota e Coração do Mundo mostram esses bônus junto da Fé por clique. Todos os cartões de conquistas agora exibem seus buffs.
- Os níveis adicionais da Cornucópia e da Tocha agora custam 15% mais a cada compra após o nível 20. Compra máxima e automação somam os preços crescentes; níveis já adquiridos são preservados.
- Avatar Solar agora exige apenas Avatar do Eclipse e 1e30 Fé, sem precisar de Gnosis Suprema.
- Cripta Eterna preserva todas as Relíquias e libera níveis ilimitados para Cornucópia de Amalteia e Tocha de Prometeu, com suporte a compra máxima, automação e saves.
- Os nós da Gnose agora aparecem por custo e pré-requisitos em cada tier. Os custos iniciais e intermediários foram reduzidos; saves da revisão anterior recebem a diferença das compras já feitas uma única vez.

- Os números agora seguem o padrão brasileiro: abaixo de mil aparecem por extenso e depois viram K, M, B e T (por exemplo, `1,5K` e `2,02B`). A notação científica fica só a partir de `1e15`. Decimais, tempos e percentuais usam vírgula.
- A Pena Solar de Fênix aparece logo depois da Cornucópia e agora diz que revela o Rito que multiplica os Fragmentos de cada Transmutação.
- O Avatar Neófito produz o dobro de Fervor, deixando o começo da Encarnação menos arrastado.
- Os Ritos de Fervor mostram o efeito atual e o do próximo nível.
- A tela inicial mostra a forma final da Esfera.
- Textos revisados: explicações corrigidas no Altar da Encarnação, nas dicas de Fé e Fragmentos e na Gnosis Suprema; nova lore dos Avatares; tutoriais da Encarnação e dos Guardiões divididos por tema; a Esfera é sempre "clicada".
- A Ressonância da Gnose só aparece na aba de Fervor quando já rende bônus.

## 0.9.1 — 2026-11-06

- Recursos, custos e multiplicadores agora usam notação científica em toda a interface (por exemplo, `1e6` e `2.5e0`), substituindo K, M, B, T e Q. Tempos, níveis e percentuais mantêm o formato comum.

- Os custos dos nós da Gnose foram reduzidos para encurtar a campanha, com cortes proporcionalmente maiores nos upgrades mais caros e automações acessíveis mais cedo.

- Anúbis, Hades, Odin e Caos Primordial ganharam animações próprias de derrota, que tocam após a vitória, antes do retorno dos Fiéis e da Encarnação.
- A animação da Esfera ficou mais leve, sem perder a velocidade dos giros nem as mudanças a cada clique.
- O áudio nas configurações foi reunido em três controles: volume geral, música e efeitos. Cada um tem um ícone para ativar ou silenciar sem perder o volume escolhido, e as preferências ficam salvas.
- O volume base dos efeitos sonoros foi dobrado para deixar os sons de rituais e cliques mais audíveis.
- Cada clique no Altar da Encarnação agora acrescenta 3 segundos de Bênção, em vez de 10, mantendo o limite acumulado de 60 segundos.
- As evoluções da Esfera ganharam desenhos revisados. Cada clique muda a velocidade dos aros e pode inverter o sentido do giro, com transições suaves.
- O Pátio dos Fiéis agora continua visível enquanto a Encarnação reúne os Fiéis para o duelo e vai ficando transparente quando a procissão parte. Depois da vitória, ele reaparece a tempo de receber todos de volta.
- O jogo ficou mais leve, principalmente no celular: carrega mais rápido, baixa menos dados e as lutas rodam com mais fluidez.

## 0.9.0 — 2026-11-06

- Corrigido o problema que deixava o jogador preso apenas com o Pátio dos Fiéis depois de uma Ascensão: o card de Desbloqueios agora volta na hora, sem precisar recarregar a página.
- Durante as lutas, os menus e a barra inferior desaparecem para deixar a tela limpa, e voltam ao final do combate.
- Os cartões de aparar agora surgem ao redor da Esfera, afastados do Guardião, sem cobrir o alvo dos seus golpes nem as barras de vida.
- A balança de Anúbis ganhou um cartão próprio, **PESAR**, com o peso visível dentro dele. Escolha sempre o maior peso.
- As barras de vida do Guardião e da Esfera mostram um rastro do dano recebido, e os números de dano ficaram menores. Os textos da luta também ficaram mais curtos e continuam legíveis com a câmera afastada.
- A Câmara da Gnose foi reorganizada: agora mostra quanta Fé falta para a próxima Gnose, exibe o nome de cada nó e explica seus efeitos em linguagem simples.
- A confirmação da Ascensão ficou mais curta e aparece apenas na primeira vez. A opção **Confirmar Ascensão** permite reativá-la.
- Os tutoriais foram reescritos com explicações mais claras, e os Guardiões ganharam um tutorial próprio depois da primeira Ascensão.
- As notificações foram revisadas: as repetitivas saíram, as restantes ficam na tela conforme o tamanho do texto e pausam com o mouse em cima, e a barra de tempo agora termina junto com elas. O aviso da Vigília Sagrada só aparece depois de pelo menos um minuto fora do jogo.
- O menu de configurações ganhou o controle **Volume dos Efeitos**, e o botão de música agora mostra notas musicais, riscadas quando a música está desligada.
- O quadro ficou mais alto, para que menus compridos caibam acima e abaixo da Esfera. O card de Relíquias Divinas passou a usar o diamante dos Fragmentos, e as etiquetas dos cards saíram.
- No celular, a caixa azul que aparecia ao tocar na Esfera e nos botões foi removida.

## 0.8.1 — 2026-11-04

- A Esfera ganha cinco formas animadas que acompanham a Encarnação: o núcleo inicial gira, o desbloqueio revela Meridiano, e as evoluções seguintes revelam Equador, Órbitas e Plenitude Armilar. Órbitas usa a segunda versão da animação, e Plenitude Armilar mantém a primeira animação criada, tanto no Avatar do Eclipse quanto no Solar.
- A forma da Esfera é atualizada automaticamente ao carregar o progresso e após a Ascensão. A preferência por movimento reduzido exibe imagens estáticas de cada forma.
- Aparar um ataque bloqueia o golpe sem causar dano à Esfera nem ao Guardião, inclusive nos ataques especiais. A aparada mantém a carga de +25% da Esfera, e a interface deixa de anunciar dano ao boss.
- A balança de Anúbis apresenta dois balões **APARAR**, cada um com um número diferente acima. Escolher apenas o maior bloqueia o ataque sem dano; clicar no menor causa o dobro do dano normal à Esfera; clicar no maior e depois no menor causa o triplo. Se nenhum for escolhido, o ataque causa dano normal uma única vez.
- A vitória ganha uma animação com o desaparecimento do Guardião. Depois, a Encarnação conduz os Fiéis de volta às suas posições no pátio, espera todos chegarem e retorna ao próprio altar. A câmera acompanha o retorno, e o resultado da batalha aparece ao final da sequência.
- Os menus de Relíquias, Encarnação e Gnose são minimizados automaticamente quando todas as melhorias são concluídas. Eles podem ser reabertos manualmente e voltam a minimizar ao concluir novamente as compras após um reset.

## 0.8.0 — 2026-11-04

Referência inicial: `7121e2f`, com as mudanças posteriores incluídas nesta versão.

- Ao abrir o jogo em uma versão diferente da última vista neste navegador, uma janela apresenta as novidades e o histórico de versões. Depois de fechada, ela só volta automaticamente quando a versão muda. O histórico também fica disponível em **Configurações → Ver novidades**.
- A trilha ambiente foi renovada, e os combates ganharam uma música própria. Ao sair da batalha, a música do santuário retorna; ambas respeitam as preferências de áudio.
- Os recursos do painel superior ganharam dicas com descrições, saldos, produção e bônus, acessíveis pelo mouse, teclado e toque.
- Os tutoriais e avisos de desbloqueio explicam melhor a Bênção, os milagres dos Fiéis, os picos de produção, a Transmutação e a preparação para os Guardiões.
- Os preços de Gnose acima de mil foram arredondados para dois algarismos significativos, deixando as metas mais legíveis. Os novos valores também são os preços efetivamente cobrados.
- A Transmutação passou a acontecer diretamente ao clicar, sem uma confirmação adicional. O painel de Relíquias passou a se chamar **Relíquias Divinas**, e o jogo ganhou um ícone de aba com a Esfera.

- As batalhas agora exigem um culto desenvolvido de forma equilibrada. Fé, Fiéis, Fervor, Relíquias, Encarnação e Gnose determinam a prontidão para enfrentar cada Guardião, e a interface destaca os pilares que precisam de atenção.
- Cultos com menos de 60% de prontidão não causam dano. Abaixo de 80%, um golpe não aparado destrói a proteção da Esfera, e a pressão contínua pode encerrar a luta em poucos segundos.
- Os Guardiões ganharam ataques especiais próprios: balanças de Anúbis, correntes de Hades, o corvo de Odin e selos orbitais do Caos Primordial.
- As mudanças de fase ficaram mais perigosas, com ondas de choque que retiram integridade da Esfera. Aparar e usar o Fulgor Divino ajudam no ataque; os milagres dos Fiéis recuperam a integridade.
- A opção **Relembrar Duelo** permite enfrentar novamente Guardiões derrotados e registrar o melhor tempo, sem repetir recompensas nem aplicar maldição por derrota na revanche.
- A apresentação do jogo, o guia de design e a referência de fórmulas foram atualizados, com capturas da interface e documentação de progressão reorganizada.

## 0.7.8 — 2026-11-03

Referência: `0ffe0eb`.

- Os Guardiões atacam com mais frequência, dão menos tempo para aparar e punem mais os erros. O dano passivo, os cliques e as fendas tiveram seus limites reduzidos para prolongar os confrontos.
- A câmera acompanha a Encarnação durante a formação do círculo, mostra a chegada do Guardião e depois enquadra o combate. O retorno ao tabuleiro após a vitória também foi ajustado.
- O Caos Primordial recebeu uma nova versão de suas animações, com levitação e ataques à distância alternados.
- Aparar um golpe agora mantém sua animação interrompida mesmo quando outro golpe perdido é processado na mesma atualização.

## 0.7.7 — 2026-11-03

Referência: `4ff8a24`.

- As batalhas passaram a acontecer no próprio tabuleiro, com a Esfera e o Guardião integrados ao cenário.
- Antes de cada confronto, a Encarnação e os Fiéis percorrem o santuário e formam um círculo sagrado ao redor dos dois combatentes. O Guardião só chega e a luta só começa depois que o ritual termina.
- O círculo foi ampliado, e os caminhos dos participantes foram ajustados para funcionar mesmo quando os altares são movidos pelo jogador.
- A área clicável acompanha a silhueta animada do Guardião durante sua chegada, seus movimentos e seus ataques.
- A Esfera ganhou arte em camadas, e Hades assumiu o lugar de Cronos na apresentação do segundo Guardião.

## 0.7.6 — 2026-11-02

Referência: `e137407`.

- A Esfera, os Fiéis e as formas da Encarnação receberam arte hermética em pixel art e animações integradas ao jogo.
- A aparência dos Fiéis e da Encarnação passou a acompanhar sua evolução, renovando o Pátio dos Fiéis e o altar.

## 0.7.5 — 2026-10-30

Referência: `de398fd` — integração da ramificação `feat/restore-dodeca-visual` à principal.

- A versão principal passou a reunir a revisão visual do santuário, as melhorias de progressão, os tutoriais e o painel de status do culto desenvolvidos na ramificação.
- Este marco registra a integração das mudanças anteriores; o merge não acrescentou alterações em relação ao último commit da ramificação integrada.

## 0.7.4 — 2026-10-30

Referência: `a6b8f00`.

- Clicar no nome do jogo abre uma janela dedicada ao status do culto, com as estatísticas atualizadas da partida.
- As estatísticas saíram das Configurações e ficaram acessíveis também no celular. A janela pode ser fechada pelo botão, pela tecla Escape ou ao clicar fora dela.

## 0.7.3 — 2026-10-30

Referência: `863bd90`.

- O tabuleiro ficou maior, com painéis mais compactos, tipografia revisada e cartões que podem ser movidos e recolhidos para organizar o santuário.
- Tutoriais aparecem conforme cada sistema é desbloqueado. Os avisos de Transmutação já vistos ficam salvos para evitar repetições.
- A opção **Nerds** permite consultar fórmulas em dicas na interface.
- As automações deixaram de reservar recursos para objetivos futuros, removendo o comportamento introduzido na versão 0.7.2.
- As animações dos personagens e os efeitos passaram a ter limite de 30 quadros por segundo para reduzir o trabalho de renderização.

## 0.7.2 — 2026-10-29

Referência: `a9bcccc`.

- A progressão foi recalibrada com simulações de vinte sementes, revisando custos da Gnose, ganhos de Ascensão e a evolução dos Avatares. Cada nó assimilado passou a multiplicar permanentemente a produção por quatro.
- Gastar Fervor ou Fragmentos deixou de reduzir a força de produção já alcançada no ciclo. Esses picos são reiniciados na Ascensão.
- As automações de Fiéis, Ritos e Relíquias ganharam controles independentes. Também foi introduzida uma estratégia de reservar recursos para objetivos de progressão, posteriormente removida na versão 0.7.3.
- A Bênção passou a acumular dez segundos por acionamento, até um minuto. O Avatar Solar passou a exigir Gnosis Suprema, com custo revisto.
- Os pedidos de milagre passaram a recompensar a produção e o poder dos cliques, sem render um percentual da Fé guardada. O Selo da Gnose passou a reconhecer o limiar de acesso sem consumir esse saldo.
- O tempo de produção durante ausência foi limitado a 24 horas, e partidas antigas receberam ajustes de migração para preservar compras e devolver diferenças de preços quando aplicável.

## 0.7.1 — 2026-10-28

Referência: `fbee35b`.

- Títulos repetidos foram removidos de painéis, do altar da Encarnação e das melhorias da Gnose, deixando a interface mais limpa.

## 0.7.0 — 2026-10-28

Referência: `348d820` — primeiro marco deste histórico.

- O combate passou a considerar o desenvolvimento de todo o culto, com requisitos próprios para cada Guardião, pressão contínua sobre o altar e bônus por aparar golpes em sequência.
- O acesso aos Guardiões dos tiers III e IV passou a exigir pelo menos dois nós do tier anterior. A interface ganhou indicações dos requisitos e uma estimativa de duração do confronto.
- O Caos Primordial substituiu Tiamat como desafio final, preservando as vitórias e recompensas das partidas antigas.
- O Pátio dos Fiéis e o santuário da Encarnação receberam novos fundos.
