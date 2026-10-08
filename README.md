# 👁️ Cult of the Sphere (Idle Clicker)

Jogo idle/clicker monocromático em **TypeScript** + **Vite**, com estética *dark glass*. A curva de progressão é inspirada em **DodecaDragons**.

> **Lore:** você é **a Esfera**, um deus cujo centro está em toda parte e cuja circunferência não está em lugar nenhum (a *esfera hermética*). Há eras você foi selada, e os homens passaram a adorar outros deuses. Mas tudo é Mente: um deus só existe enquanto alguém pensa nele. Agora você desperta, converte fiéis, rompe seus selos e restaura as relíquias dos deuses que morreram esquecidos. Os que ainda vivem serão seus rivais.

---

## 📖 Como o jogo funciona

### 1. Fé — o recurso base
- **Clique na Esfera** para gerar **Fé** (base 1 por clique, multiplicada por Fervor, upgrades e conquistas).
- **Fiel Devoto**: único gerador. Custa 20 Fé, escala ×1.10 por compra e produz +1 Fé/s (antes dos multiplicadores). O botão **Converter Máximo** libera com 25 fiéis.
- **Milagres**: de tempos em tempos (~35–65 s) um fiel na arena pede um milagre. Clicar nele concede `30 × Fé/s + 10% da Fé atual`.

### 2. Selos (desbloqueios)
| Selo | Custo | Efeito |
|---|---|---|
| Selo da Encarnação | 200 Fé | Inicia a geração de Fervor (1/s) e abre a aba **Encarnação** |
| Selo do Fervor | 5.000 Fé | Abre a aba **Fervor** com os upgrades de Fervor |
| Selo das Relíquias | 20M Fé | Abre a aba **Relíquias** (prestígio) e inicia a geração de Fragmentos |

### 3. Encarnação
- 5 estágios que multiplicam o Fervor/s: **1× → 100× → 10⁴× → 10⁸× → 10¹⁵×** (custos: 2,5M · 1e12 · 1e25 · 1e150 Fé).
- O estágio e o Fervor acumulado também multiplicam os fiéis: `1 + log10(1 + Fervor/150) × 1.5 × estágio`.
- O botão de Bênção sob a Esfera adiciona **+2 s de Bênção 2×** na Fé/s (máx. 60 s).

### 4. Fervor
- O Fervor acumulado multiplica toda a Fé: `(log10(Fervor/10 + 1) × 2 + 1) × efeito`.
- 6 upgrades comprados com Fervor (o nome diz o efeito; o tooltip traz o rito correspondente na lore):

| Upgrade | Fórmula |
|---|---|
| Aumentar Produção de Fervor | `2^(nível^0.6)` |
| Aumentar Efeito do Fervor | `1.25^(nível^0.8)` |
| Aumentar Fé por Clique | `nível^2.6 × 4 + 1` |
| Fiéis Aumentam Fé por Segundo | `nível^1.5 × fiéis / 50 + 1` |
| Fé Aumenta Fervor por Segundo | `nível^1.5 × log10(Fé + 1) / 5 + 1` |
| Aumentar Ganho de Fragmentos *(requer Pena da Fênix)* | `3^(nível^0.6)` |

### 5. Relíquias e Fragmentos (prestígio)
- **Fragmentos** são a moeda de prestígio; **relíquias** são os itens restaurados com eles.
- Fragmentos só são gerados **depois** do Selo das Relíquias.
- **Transmutar**: zera apenas a Fé atual e concede `floor(log2(Fé + 1) × bônus)` Fragmentos (espera de 3 s). Fiéis, Fervor e upgrades são mantidos.
- **Geração passiva**: `max(1, melhor transmutação / 10)` Fragmentos/s, mais 5% do valor de transmutação por segundo com o Anel de Draupnir.

| Relíquia | Custo (Fragmentos) | Efeito |
|---|---|---|
| Cornucópia de Amalteia | 200 | +20% Fé/s por nível (máx. 20) |
| Tocha de Prometeu | 500 | +20% Fervor/s por nível (máx. 20) |
| Pena Solar de Fênix | 750 | Fervor/s ×1,5 e libera o upgrade de ganho de Fragmentos |
| Cajado de Hermes | 1.500 | Custo dos fiéis escala mais devagar (máx. 5) |
| Anel de Draupnir | 2.000 | Rende 5% da Transmutação por segundo, sem gastar Fé |
| Arca da Aliança Cósmica | 15.000 | Fragmentos multiplicam a Fé/s: `(log10(fragmentos + 1) + 1)^(nível × 1.2)` (máx. 4) |

### 6. Conquistas
16 marcos (cliques, fiéis, Fé total e Fé/s), cada um com um bônus permanente:

| Categoria | Afeta | Total possível |
|---|---|---|
| Clique | Fé por clique | +115% |
| Produção Passiva | Fé/s dos fiéis | +130% |
| Produção Global | Clique **e** Fé/s | +105% |
| Desconto | Custo dos Fiéis | −5% (teto de −50%) |

Bônus da mesma categoria **somam**; categorias diferentes **multiplicam** entre si (ex.: Fé/s = passiva × global).

---

## ✨ Outras funcionalidades
- 🎮 **Arenas animadas em Canvas 2D**: pátio dos fiéis (com sprites e milagres) e altar da Encarnação.
- 💾 **Salvamento automático** no `localStorage` a cada 20 s, ao trocar de aba e ao fechar a página, com cópia de backup.
- 📤 **Exportar/Importar save** em Base64 e reset completo nas Configurações.
- 🔊 Áudio sintetizado (Web Audio) + trilha sonora, e vibração em dispositivos móveis.
- 🧭 Modal de introdução, guia de onboarding, tooltips e notificações de conquistas.
- 📱 Layout responsivo com navegação mobile.

> **Ainda não implementado:** progresso offline e os 6 Deuses Rivais que orbitam a Esfera (por enquanto só ativáveis pelo console via `unlockSphereSatellite(i)`).

---

## 🚀 Como Executar

### Pré-requisitos
- [Node.js](https://nodejs.org/) (v18+) ou [Nix](https://nixos.org/)

### Usando npm
```bash
npm install       # Instalar dependências
npm run dev       # Servidor de desenvolvimento (http://localhost:5173)
npm run build     # Verificar tipos e compilar para produção
npm run preview   # Pré-visualizar o build de produção
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
├── Base/                    # Documentos de design e balanceamento
├── public/assets/           # Spritesheet dos fiéis, fundo do pátio e trilha sonora
├── scripts/                 # Utilitários (geração de ícones)
├── src/
│   ├── config/              # Dados do jogo: fiéis, fervor, incarnation, relíquias, unlocks, conquistas
│   ├── core/
│   │   ├── GameState.ts         # Estado, regras, multiplicadores e serialização
│   │   ├── GameLoop.ts          # Loop de ticks (10/s)
│   │   └── EventBus.ts          # Eventos entre sistemas e UI
│   ├── systems/
│   │   ├── calculations.ts      # Fórmulas puras (custos, taxas, bônus, formatação)
│   │   ├── saveSystem.ts        # Persistência, backup, export/import
│   │   ├── audio.ts             # Áudio sintetizado e trilha
│   │   └── notifications.ts     # Popups de notificação
│   ├── features/            # Uma pasta por aba: followers, incarnation, fervor, relics,
│   │                        #   unlocks, achievements, stats e a esfera (sphere)
│   ├── ui/                  # HUD, navegação, modais, onboarding, tooltips e arenas em canvas
│   ├── styles/              # CSS por área (base, hud, cards, panels, modals, sphere, responsive)
│   ├── types.ts             # Tipagens compartilhadas
│   └── main.ts              # AppManager: instancia e conecta todos os módulos
├── index.html               # Estrutura da página e fontes
└── shell.nix                # Ambiente Nix
```
# Desktop art pass

The gameplay screen now uses a Prophet-led procession above the existing management controls, with a bottom-centre sacred window for Sphere clicks. New recruits join the bounded entourage; the exact population remains in the HUD. Miracle requests appear above a follower in the procession and keep the existing reward calculation.

Run `npm ci` and `npm run dev`. Open `/?art-review=early` or `/?art-review=late` for the two approval states. The review controls switch the visual era and preview a miracle. Review mode uses disposable sample progress, skips loading/saving game progress, and blocks importing or resetting a save.

The later Ascension is a visual study, not an implemented progression system. Normal play uses the early scene. Persistent Ascension milestones, intermediate Sphere stages, actual 4–6-frame walking sheets, separate parallax layers and milestone destinations remain subsequent production work. Current supplied characters use restrained stepped pose movement rather than new animation sheets. Reduced-motion settings disable that movement.

Artwork is in `public/assets/procession/`: the supplied Prophet and follower-role sheet were cropped, cleaned of disconnected fragments and normalized with nearest-neighbour sampling; the landscape comes from the supplied empty scene. The circular monastery was generated using PixelLab Pixen through Executor (job `2b3bd5de-34ac-4c92-997b-dc4fe19db9dc`). The world Sphere and sacred window share the same pixel drawing.

Approval checks: distinguish the Prophet, roles and Sphere stages at desktop size; read totals and frequent actions immediately; keep the full entourage legible; match nearby scenery to the character pixel scale; and make the later ritual disturbing without explicit gore. Desktop layouts are checked at 1440×900 and 1280×720.

Add `&all-tabs=1` to either art-review URL to inspect all six tabs and Status in Settings with disposable sample currencies. This mode does not load or write your saved game.
