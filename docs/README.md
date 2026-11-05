# Documentação do culto

| Documento | Conteúdo |
| --- | --- |
| [README](../README.md) | Apresentação, capturas e execução local. |
| [Changelog](../CHANGELOG.md) | Versão atual e histórico de mudanças do jogo. |
| [GDD](../GDD.md) | Visão, sistemas, jornada, combate e experiência implementada. |
| [Fórmulas](../FormulasJogo.md) | Custos, multiplicadores, limites, persistência e migrações. |
| [Glossário](../GLOSSARY.md) | Termos do domínio. |
| [Progressão e benchmark](progression/README.md) | Perfis, método e comandos para medições novas. |
| [Capturas](screenshots/README.md) | Origem e atualização das imagens usadas na documentação. |
| [Issue tracker](agents/issue-tracker.md) | Convenções de tarefas e especificações no GitHub. |

Os catálogos de `src/config/` e o estado em `src/core/GameState.ts` são as fontes dos valores executados. Ao mudar uma regra, atualize o GDD e a seção correspondente de fórmulas. Ao mudar o visual, renove as capturas.

Relatórios gerados, builds e pacotes de distribuição ficam fora do controle de versão. Use `reports/` para novas saídas locais de benchmark. Propostas futuras ficam nas Issues, separadas do comportamento implementado.
