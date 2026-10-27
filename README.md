# 👁️ Cult of the Sphere (Idle Clicker)

Jogo idle/clicker hermético em **TypeScript** + **Vite**, com tabuleiro panorâmico 2D e curva de progressão inspirada em **DodecaDragons**.

> **Lore:** você é **a Esfera**, um deus cujo centro está em toda parte e cuja circunferência não está em lugar nenhum (a *esfera hermética*). Há eras você foi selada, e os homens passaram a adorar outros deuses. Mas tudo é Mente: um deus só existe enquanto alguém pensa nele. Agora você desperta, converte fiéis, rompe seus selos, restaura as relíquias dos deuses que morreram esquecidos e ascende à Gnose.

---

## 📖 Como o jogo funciona

### 1. Fé — o recurso base
- **Clique na Esfera** para gerar **Fé** (base 1 por clique, multiplicada por Fervor, upgrades, conquistas e Gnose).
- **Fiel Devoto**: gerador passivo no `Pátio dos Fiéis`. Custa 20 Fé, escala ×1.10 por compra (reduzível até ×1.055 com o *Cajado de Hermes*) e produz +1 Fé/s (antes dos multiplicadores). O botão **Converter Máximo** libera com 25 fiéis (ou desde 0 fiéis com *Memória Hermética*).
- **Milagres**: de tempos em tempos (~35–65 s) um fiel pede um milagre no pátio. Clicar no balão de prece concede `max(30, 15 × Fé por Clique, floor(30 × Fé/s + 10% da Fé atual))`.

### 2. Selos (desbloqueios sequenciais)
| Selo | Custo | Efeito |
|---|---|---|
| Selo da Encarnação | 200 Fé | Inicia a geração de Fervor (1/s) e abre o card **Encarnação Sagrada** |
| Selo do Fervor | 5.000 Fé | Abre o card **Fervor Sagrado** com os Ritos de Fervor |
| Selo das Relíquias | 20M Fé | Abre o card **Opus Magnum (Relíquias)** e inicia a geração de Fragmentos |
| Selo da Gnose | 1Q (`1e15`) Fé | Abre a **Câmara da Gnose** (True Prestige) e a Árvore Hermética |

### 3. Encarnação Sagrada
- 5 estágios que multiplicam o Fervor/s: **1× → 100× → 10⁴× → 10⁸× → 10¹⁵×** (custos: 0 · 2,5M · 1T · 1e25 · 1e150 Fé).
- O estágio e o Fervor acumulado também multiplicam os fiéis: `1 + log10(1 + Fervor/150) × 1.5 × estágio` (triplicado com *Olho de Trismegisto*).
- Clicar no **Altar da Encarnação** adiciona **+2 s de Bênção 2×** na Fé/s (máx. 60 s).

### 4. Fervor Sagrado
- O Fervor acumulado multiplica toda a Fé: `(log10(Fervor/10 + 1) × 2 + 1) × efeito`.
- 6 Ritos comprados com Fervor (o 6º rito é revelado ao restaurar a *Pena Solar de Fênix*):

| Rito de Fervor | Custo Base (Escala) | Fórmula |
|---|---|---|
| Aumentar Produção de Fervor | 50 (×1.8) | `2^(nível^0.6)` *(evolui para `3.5^(nível^0.7)` com Fogo Hermético)* |
| Aumentar Efeito do Fervor | 100 (×2.0) | `1.25^(nível^0.8)` |
| Aumentar Fé por Clique | 100 (×1.4) | `nível^2.6 × 4 + 1` |
| Fiéis Aumentam Fé/s | 500 (×1.5) | `nível^1.5 × fiéis / 50 + 1` |
| Fé Aumenta Fervor/s | 500 (×2.5) | `nível^1.5 × log10(Fé + 1) / 5 + 1` |
| Aumentar Ganho de Fragmentos *(requer Pena Solar de Fênix)* | 20M (×5.0) | `3^(nível^0.6)` |

### 5. Relíquias e Fragmentos (Opus Magnum)
- **Fragmentos** são a moeda de transmutação alquímica; **Relíquias** são os artefatos mitológicos restaurados com eles.
- **Transmutar**: zera apenas a Fé atual e concede `floor(log2(Fé + 1) × bônus)` Fragmentos (espera de 3 s). Fiéis, Fervor e upgrades são mantidos.
- **Geração passiva**: `max(1, floor(melhor transmutação / 10))` Fragmentos/s, somada aos bônus percentuais da Transmutação atual por segundo (*Anel Divino de Draupnir* +5%/s, *Cripta Eterna* +25%/s, *Transmutação Espontânea* +100%/s).

| Relíquia | Custo (Fragmentos) | Efeito |
|---|---|---|
| Cornucópia de Amalteia | 200 | +20% Fé/s por nível (máx. 20) |
| Tocha de Prometeu | 500 | +20% Fervor/s por nível (máx. 20) |
| Pena Solar de Fênix | 750 | Fervor/s ×1,5 e revela o 6º Rito de Fervor (*Aumentar Ganho de Fragmentos*) |
| Cajado de Hermes | 1.500 | Custo dos fiéis escala mais devagar em −0.005 por nível (máx. 5) |
| Anel Divino de Draupnir | 2.000 | Rende +5% da Transmutação por segundo, sem gastar Fé |
| Arca da Aliança Cósmica | 15.000 | Fragmentos multiplicam a Fé/s: `(log10(fragmentos + 1) + 1)^(nível × 1.2)` (máx. 4) |

### 6. Câmara da Gnose (True Prestige)
- Desbloqueada ao romper o **Selo da Gnose** (`1Q` / `1e15` Fé).
- **Ascensão Gnóstica**: dissolve o culto terreno em troca de **Gnose** pela curva sub-exponencial `floor(((Fé / 1e15) ^ 0.15) × mult)`.
- **Bônus Passivo Permanente**: cada ponto de Gnose total adquirido ao longo dos ciclos concede `1 + TotalGnose^0.35 × 1.5` (ampliado em +50% com *Olho do Infinito*), de modo que gastar Gnose nunca reduz sua produção.
- **Árvore Hermética (20 upgrades em 4 Tiers)**:
  - **Tier I — Despertar & Automação (8 nós):** Emanação Primordial (8× Fé, 3× Fervor, 3,5× Fragmentos e saldo de até 1.000 Fé imediatamente), Memória Hermética, Chama Astral, Pulso Cósmico (10× clique e +25% Fé/s), Dilatação Hermética e as três automações: **Recrutamento Astral (3 Gnose), Ritos Automáticos (5), Transmutação Espontânea (8)**.
  - **Tier II — Persistência & Sinergia (5 nós):** Congregação Esférica, Vigília Perpétua (2× sem ativação manual, por 30 Gnose), Cripta Eterna, Altar Ressonante e Transmutação Áurea (4× Fragmentos, evolução do Rito alquímico e Auto-Relíquias a 25%/s).
  - **Tier III — Evoluções Herméticas (5 nós):** Coro Cúbico (`1 + Fiéis^3`), Olho de Trismegisto, Fogo Hermético, Forja Cósmica (`5 × efeito do 5º Rito^1.35`) e Harmonia Planetária (até 7× Fé/Fervor conforme as Relíquias restauradas).
  - **Tier IV — Onisciência & Apoteose (2 nós):** Olho do Infinito (2× Gnose, 1,5× bônus vitalício e gratuidade das automações) e Gnosis Suprema (100× Fé/Fervor, 2× Gnose e custos de 1e20/1e36 Fé para Eclipse/Solar).
- **Compradores automáticos:** reservam 25% da renda por segundo, acumulando verba até 10% do saldo; os custos normais só são descontados ao comprar. A verba acompanha o save. Auto-Relíquias rende 10% da Transmutação/s, depois 25% com Transmutação Áurea e 100% com Olho do Infinito, sem consumir Fé. Os três toggles podem ser pausados.
- Revisão completa dos 20 efeitos e validação dos perfis: [gnose-revisada-2026-10-27.md](Base/gnose-revisada-2026-10-27.md).

### 7. Conquistas
**19 marcos** (cliques, fiéis, Fé total, Fé/s e Ascensões/Gnose), cada um com um bônus permanente:

| Categoria | Afeta | Total possível |
|---|---|---|
| Clique (`fpc_mult`) | Fé por clique | +115% |
| Produção Passiva (`fps_mult`) | Fé/s dos fiéis | +180% |
| Produção Global (`global_mult`) | Clique **e** Fé/s | +230% |
| Desconto (`cost_discount`) | Custo dos Fiéis | −5% (teto de −50%) |

Bônus da mesma categoria **somam**; categorias diferentes **multiplicam** entre si (ex.: Fé/s = passiva × global).

---

## ✨ Outras funcionalidades
- 🗺️ **Tabuleiro 2D Panorâmico (Dodeca-Board)**: navegação livre com arraste (pan), zoom no cursor/pinça e barra rápida de acesso aos cards desbloqueados.
- 🛠️ **Painel de Testes & Benchmark por Sessões (`[T]` ou `[F2]`)**: modificadores de velocidade (`0x` a `100x`), concessão rápida de recursos e simulador de progressão por sessões comparando **Ativo**, **Casual** e **AFK**, com seed fixa, ações manuais e conclusão explícita; executado num Web Worker.
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
