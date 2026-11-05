# Changelog

Histórico de mudanças de *Cult of the Sphere*, em ordem da versão mais recente para a mais antiga.

A versão atual é **0.8.1**. A numeração anterior foi atribuída retrospectivamente aos últimos dez commits: o mais antigo corresponde à 0.7.0, os oito seguintes vão de 0.7.1 a 0.7.8 e o mais recente inicia a 0.8.0. As datas anteriores são as dos commits de referência, não datas de publicação. A 0.8.0 também reúne as mudanças locais mais recentes.

Para as próximas versões, usamos `MAJOR.MINOR.PATCH`: novidades e mudanças relevantes de jogabilidade avançam o número do meio; correções e ajustes menores avançam o último. Enquanto o jogo estiver em desenvolvimento, o primeiro número permanece em zero. Cada nova versão deve atualizar este arquivo, `package.json` e a versão do projeto em `package-lock.json`.

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
