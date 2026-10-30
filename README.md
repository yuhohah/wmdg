# 👁️ Cult of the Sphere (Idle Clicker)

Jogo idle/clicker hermético em **TypeScript** + **Vite**, com tabuleiro panorâmico 2D e curva de progressão inspirada em **DodecaDragons**.

> **Lore:** você é **a Esfera**, um deus cujo centro está em toda parte e cuja circunferência não está em lugar nenhum (a *esfera hermética*). Há eras você foi selada, e os homens passaram a adorar outros deuses. Mas tudo é Mente: um deus só existe enquanto alguém pensa nele. Agora você desperta, converte fiéis, rompe seus selos, restaura as relíquias dos deuses que morreram esquecidos e ascende à Gnose.

---

## 📖 Como o jogo funciona

### 1. Fé — o recurso base
- **Clique na Esfera** para gerar **Fé** (base 1 por clique, multiplicada por Fervor, upgrades, conquistas e Gnose).
- **Fiel Devoto**: gerador passivo no `Pátio dos Fiéis`. Custa 20 Fé, escala ×1.10 por compra (reduzível até ×1.05 com o *Cajado de Hermes*, *Emanação Primordial* e *Convergência dos Fiéis*) e produz +1 Fé/s (antes dos multiplicadores). O botão **Converter Máximo** libera com 25 fiéis (ou desde 0 fiéis com *Memória Hermética*).
- **Milagres**: de tempos em tempos (~35–65 s em tempo transcorrido) um fiel pede um milagre no pátio. Clicar no balão de prece concede `max(30, 15 × Fé por Clique, floor(30 × Fé/s))`.

### 2. Selos (desbloqueios sequenciais)
| Selo | Custo | Efeito |
|---|---|---|
| Selo da Encarnação | 200 Fé | Inicia a geração de Fervor (1/s) e abre o card **Encarnação Sagrada** |
| Selo do Fervor | 5.000 Fé | Abre o card **Fervor Sagrado** com os Ritos de Fervor |
| Selo das Relíquias | 20M Fé | Abre o card **Opus Magnum (Relíquias)** e inicia a geração de Fragmentos |
| Selo da Gnose | 1Q (`1e15`) Fé *(limiar sem cobrança)* | Abre a **Câmara da Gnose** (True Prestige) e a Árvore Hermética |

### 3. Encarnação Sagrada
- 5 estágios que multiplicam o Fervor/s: **1× → 100× → 10⁴× → 10⁸× → 10¹⁵×** (custos: 0 · 2,5M · 1T · 1e25 *(1e20 com Gnosis Suprema)* · 1e30 Fé *(requer Gnosis Suprema)*).
- O estágio e o pico de Fervor do ciclo também multiplicam os fiéis: `1 + log10(1 + FervorPico/150) × 1.5 × estágio`.
- Clicar no **Altar da Encarnação** adiciona **+10 s de Bênção 2×** na Fé/s (máx. 60 s).

### 4. Fervor Sagrado
- O pico de Fervor do ciclo multiplica toda a Fé: `(log10(FervorPico/10 + 1) × 2 + 1) × efeito × ressonância`. Gastar Fervor em Ritos não reduz o bônus conquistado no ciclo.
- 6 Ritos comprados com Fervor (o 6º rito é revelado ao restaurar a *Pena Solar de Fênix*):

| Rito de Fervor | Custo Base (Escala) | Fórmula |
|---|---|---|
| Aumentar Produção de Fervor | 50 (×1.8) | `2^(nível^0.6)` *(base evolui para 2,05 / 2,35 / 2,65 com Chama Astral, Fogo Hermético e Fogo Empíreo)* |
| Aumentar Efeito do Fervor | 100 (×2.0) | `1.25^(nível^0.8)` |
| Aumentar Fé por Clique | 100 (×1.4) | `nível^2.6 × 4 + 1` |
| Fiéis Aumentam Fé/s | 500 (×1.5) | `nível^1.5 × fiéis / 50 + 1` |
| Fé Aumenta Fervor/s | 500 (×2.5) | `nível^1.5 × log10(Fé + 1) / 5 + 1` |
| Aumentar Ganho de Fragmentos *(requer Pena Solar de Fênix)* | 20M (×5.0) | `3^(nível^0.6)` *(base evolui para 3,05 / 3,40 / 3,75 com Alquimia Astral, Alquimia Hermética e Opus Perfeito)* |

### 5. Relíquias e Fragmentos (Opus Magnum)
- **Fragmentos** são a moeda de transmutação alquímica; **Relíquias** são os artefatos mitológicos restaurados com eles.
- **Transmutar**: zera apenas a Fé atual e concede `floor(log2(Fé + 1) × bônus)` Fragmentos (espera de 3 s). Fiéis, Fervor e upgrades são mantidos.
- **Geração passiva**: `MR × (max(1, floor(melhor transmutação / 10)) + bônus percentuais da Transmutação atual por segundo)` (*Anel Divino de Draupnir* +5%/s e *Olho do Infinito* +100%/s, com Auto-Transmutação ativa).

| Relíquia | Custo (Fragmentos) | Efeito |
|---|---|---|
| Cornucópia de Amalteia | 200 | +20% Fé/s por nível (máx. 20) |
| Tocha de Prometeu | 500 | +20% Fervor/s por nível (máx. 20) |
| Pena Solar de Fênix | 750 | Fervor/s ×1,5 e revela o 6º Rito de Fervor (*Aumentar Ganho de Fragmentos*) |
| Cajado de Hermes | 1.500 | Custo dos fiéis escala mais devagar em −0.005 por nível (máx. 5) |
| Anel Divino de Draupnir | 2.000 | Rende +5% da Transmutação por segundo, sem gastar Fé |
| Arca da Aliança Cósmica | 15.000 | Pico de Fragmentos do ciclo multiplica a Fé/s: `(log10(fragmentosPico + 1) + 1)^(nível × 1.2)` (máx. 4) |

### 6. Câmara da Gnose (True Prestige)
- Desbloqueada ao atingir o limiar do **Selo da Gnose** (`1Q` / `1e15` Fé, sem cobrança de saldo).
- **Ascensão Gnóstica**: reinicia o culto em troca de `floor((Fé / 1e15)^expoente)` Gnose; o expoente começa em 0,25 e passa a 0,28 com Olho de Trismegisto.
- **Bônus permanente**: `1 + TotalGnose^0.35 × 1.5` em Fé e Fervor, além de `4^K` (ressonância por nó assimilado) em Fé, Fervor e Fragmentos. Gastar Gnose preserva esse bônus histórico.
- **Árvore Hermética (20 upgrades em 4 Tiers)**:
  - **Tier I — Despertar & Automação (6 nós):** Emanação Primordial (1 Gnose; escala dos Fiéis −0,01, início com 1.000 Fé e sinergia `1 + sqrt(Fiéis)`), Memória Hermética (77; Encarnação permanente e compras máximas em lote), Culto Autônomo (1.816; Auto-Fiéis orientado por objetivo com reserva de 180 s), Ruptura Automática (55.923; compra todos os Selos em sequência com Fé), Chama Astral (749.310; base do Rito de Fervor 2 → 2,05 e escala 1,80 → 1,75) e Alquimia Astral (1.546.331.765; base do Rito de Fragmentos 3 → 3,05 e escala 5 → 4,90).
  - **Tier II — Persistência & Economia (6 nós, após Anúbis):** Liturgia Autônoma (10.547.999; Auto-Ritos por retorno marginal/custo), Oficina Autônoma (127.150.504; Auto-Relíquias com prioridade para a Fênix), Cripta Eterna (13.443.656.846; preserva níveis das Relíquias), Congregação Esférica (107.263.635.481; sinergia `1 + Fiéis`), Vigília Perpétua (2.102.158.069.257; Bênção 2× permanente) e Convergência dos Fiéis (19.612.553.057.056; escala dos Fiéis −0,015 adicional).
  - **Tier III — Poder do Culto (4 nós, após Cronos):** Coro Harmônico (183.392.573.867.151; sinergia dos Fiéis elevada a 1,1), Olho de Trismegisto (1.688.174.629.283.967; expoente da Ascensão 0,25 → 0,28), Alquimia Hermética (`1,51e18`; base do Rito de Fragmentos 3,40 e custo 4,60) e Fogo Hermético (`6,82e19`; base do Rito de Fervor 2,35).
  - **Tier IV — Apoteose (4 nós, após Odin):** Olho do Infinito (`6,84e21`; Fiéis/Ritos automáticos sem gasto e Auto-Transmutação de 100%/s), Gnosis Suprema (`7,92e23`; desconto de escala nos Ritos e acesso aos Avatares finais), Fogo Empíreo (`1,53e30`; base de Fervor 2,65 e custo −0,10) e Opus Perfeito (`2,49e34`; base de Fragmentos 3,75 e custo −0,40).
- **Compradores automáticos:** atuam uma vez por segundo e têm controles independentes de ativar/desativar nos próprios cards: Auto-Fiéis no Pátio (com seletor de objetivo: Automático, Próximo Selo, Próximo Avatar ou meta de Gnose, reservando Fé nos últimos 180 s), Auto-Ritos no Fervor (priorizando maior ganho relativo por custo, até 50 níveis por Rito/s) e Auto-Relíquias no Opus Magnum (poupando para a primeira Fênix e depois priorizando retorno por Fragmento até os níveis máximos). Auto-Transmutação também fica no Opus Magnum. Olho do Infinito dispensa apenas os gastos dos compradores de Fiéis e Ritos; as Relíquias continuam custando Fragmentos.
- **Selos e preservação:** Memória Hermética preserva apenas Encarnação. Ruptura Automática é uma única compra de Gnose para todos os Selos; paga os três primeiros com Fé, reconhece o limiar gratuito do Selo da Gnose, respeita pré-requisitos e volta a comprá-los após cada Ascensão. Os Selos acessíveis são processados antes da compra de Fiéis em cada ciclo. Cripta Eterna preserva níveis das Relíquias, mas o saldo de Fragmentos, os picos do ciclo e a melhor Transmutação são zerados na Ascensão.

### 7. Conquistas
**20 marcos** (cliques, fiéis, Fé total, Fé/s, Ascensões/Gnose e derrota do Caos Primordial), cada um com um bônus permanente:

| Categoria | Afeta | Total possível |
|---|---|---|
| Clique (`fpc_mult`) | Fé por clique | +115% |
| Produção Passiva (`fps_mult`) | Fé/s dos fiéis | +180% |
| Produção Global (`global_mult`) | Clique **e** Fé/s | +330% |
| Desconto (`cost_discount`) | Custo dos Fiéis | −5% (teto de −50%) |

Bônus da mesma categoria **somam**; categorias diferentes **multiplicam** entre si (ex.: Fé/s = passiva × global).

---

## ✨ Outras funcionalidades
- 🗺️ **Tabuleiro 2D Panorâmico (Dodeca-Board)**: navegação livre com arraste (pan), zoom no cursor/pinça e barra rápida de acesso aos cards desbloqueados.
- 🛠️ **Painel de Testes & Benchmark por Sessões (`[T]` ou `[F2]`)**: modificadores de velocidade (`0x` a `100x`), concessão rápida de recursos e simulador de progressão por sessões comparando **Ativo de referência**, **Ativo intenso**, **Casual** e **AFK**, com seed fixa, ações manuais e conclusão explícita; executado num Web Worker.
- 💾 **Salvamento automático** no `localStorage` a cada 20 s, ao trocar de aba e ao fechar a página, com cópia de backup.
- 📤 **Exportar/Importar save** em Base64 e reset completo nas Configurações.
- 🔊 Áudio sintetizado (Web Audio) e vibração háptica em dispositivos móveis.
- 🧭 Guia de onboarding passo a passo com foco luminoso e notificações de conquistas.

---

## 🚀 Como Executar

### Pré-requisitos
- [Node.js](https://nodejs.org/) (v18+) ou [Nix](https://nixos.org/)

### Usando npm
```bash
npm install         # Instalar dependências
npm run dev         # Servidor de desenvolvimento (http://localhost:5173)
npm test            # Executar suíte de testes (Vitest)
npm run benchmark   # Executar o benchmark por sessões (limite padrão: 72 h simuladas)
npm run build       # Verificar tipos e compilar para produção
npm run preview     # Pré-visualizar o build de produção
```

### Usando Nix (`shell.nix`)
```bash
nix-shell                     # Ambiente com Node.js e npm
nix-shell --run "npm run dev" # Ou rodar o dev server diretamente
```

---

## 📁 Estrutura do Projeto

```text
wmdg/
├── Base/                    # Documentos de design, metodologia do benchmark e balanceamento
├── docs/                    # Documentação de domínio e ADRs
├── src/
│   ├── benchmark/           # ProgressionSimulator, reporters e testes de fidelidade do benchmark
│   ├── config/              # Dados do jogo: fiéis, fervor, incarnation, relíquias, gnose, unlocks, conquistas
│   ├── core/
│   │   ├── GameState.ts         # Estado, regras, multiplicadores, automações e serialização
│   │   ├── GameLoop.ts          # Loop de ticks (10/s) com suporte a multiplicador de velocidade
│   │   └── EventBus.ts          # Eventos entre sistemas e UI
│   ├── systems/
│   │   ├── calculations.ts      # Fórmulas puras (custos, taxas, bônus, formatação)
│   │   ├── saveSystem.ts        # Persistência, backup, export/import
│   │   ├── audio.ts             # Áudio sintetizado e preferências
│   │   └── notifications.ts     # Popups de notificação
│   ├── features/            # Controladores de cada card/sistema: followers, incarnation, fervor,
│   │                        #   relics, gnose, unlocks, achievements, stats e sphere
│   ├── ui/                  # HUD, BoardManager, arenas em canvas, modais, onboarding e TestMenu
│   ├── styles/              # CSS modularizado (base, hud, cards, panels, modals, sphere, board, test-menu)
│   ├── types.ts             # Tipagens compartilhadas
│   └── main.ts              # AppManager: instancia e conecta todos os módulos
├── index.html               # Estrutura da página e tabuleiro 2D
└── shell.nix                # Ambiente Nix
```

## Validação da progressão

A implementação de [PlanoProgressao.md](PlanoProgressao.md) mantém as fórmulas em [FormulasJogo.md](FormulasJogo.md) e a comparação de cenários em [Validação da progressão](docs/progression/validation-2026-10-29.md). Resultados antigos continuam preservados em `Base/`.

```bash
node scripts/calibrate-progression.mjs Base/progression-candidates.json.gz 3 explore
node scripts/calibrate-progression.mjs Base/progression-final.json.gz 20 final
node scripts/summarize-progression.mjs Base/progression-final.json.gz
```
