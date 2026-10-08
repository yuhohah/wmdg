# 👁️ A Entidade Divina — Cult of the Sphere (Idle Clicker)

Jogo idle/clicker monocromático em **TypeScript** + **Vite**, com estética *dark glass*. Você lidera o culto de uma divindade cósmica: clica na Esfera, converte fiéis, desperta uma Encarnação, acende o Fervor e consagra Relíquias. A curva de progressão é inspirada em **DodecaDragons**.

---

## 📖 Como o jogo funciona

### 1. Fé — o recurso base
- **Clique na Esfera Divina** para gerar **Fé** (base 1 por clique, multiplicada por Fervor, upgrades e conquistas).
- **Fiel Devoto**: único gerador. Custa 20 Fé, escala ×1.10 por compra e produz +1 Fé/s (antes dos multiplicadores). O botão **Converter Máximo** libera com 25 fiéis.
- **Milagres**: de tempos em tempos (~35–65 s) um fiel na arena pede um milagre. Clicar nele concede `30 × Fé/s + 10% da Fé atual`.

### 2. Desbloqueios (aba Unlocks)
| Desbloqueio | Custo | Efeito |
|---|---|---|
| Despertar Incarnation | 200 Fé | Inicia a geração de Fervor (1/s) e abre a aba **Incarnation** |
| Ritos de Fervor | 5.000 Fé | Abre a aba **Fervor** com a árvore de upgrades |
| Desbloquear Relíquias | 20M Fé | Abre a aba **Relíquias** (prestígio) e inicia a geração de Relíquias |

### 3. Incarnation
- 5 estágios que multiplicam o Fervor/s: **1× → 100× → 10⁴× → 10⁸× → 10¹⁵×** (custos: 2,5M · 1e12 · 1e25 · 1e150 Fé).
- O estágio e o Fervor acumulado também multiplicam os fiéis: `1 + log10(1 + Fervor/150) × 1.5 × estágio`.
- Clicar no avatar adiciona **+2 s de Bênção 2×** na Fé/s (máx. 60 s).

### 4. Fervor
- O Fervor acumulado multiplica toda a Fé: `(log10(Fervor/10 + 1) × 2 + 1) × efeito`.
- 6 upgrades comprados com Fervor:

| Upgrade | Fórmula |
|---|---|
| Produção de Fervor | `2^(nível^0.6)` |
| Efeito do Fervor | `1.25^(nível^0.8)` |
| Fé por Clique | `nível^2.6 × 4 + 1` |
| Fiéis aumentam Fé/s | `nível^1.5 × fiéis / 50 + 1` |
| Fé aumenta Fervor/s | `nível^1.5 × log10(Fé + 1) / 5 + 1` |
| Ganho de Relíquias *(requer Pena de Fênix)* | `3^(nível^0.6)` |

### 5. Relíquias (prestígio)
- Só são geradas **depois** do desbloqueio de Relíquias.
- **Transmutar**: zera apenas a Fé atual e concede `floor(log2(Fé + 1) × bônus)` Relíquias (cooldown de 3 s). Fiéis, Fervor e upgrades são mantidos.
- **Geração passiva**: `max(1, melhor transmutação / 10)` Relíquias/s, mais 5% do valor de transmutação por segundo com o Anel de Draupnir.

| Relíquia | Custo | Efeito |
|---|---|---|
| Cornucópia de Amalteia | 200 | +20% Fé/s por nível (máx. 20) |
| Tocha de Prometeu | 500 | +20% Fervor/s por nível (máx. 20) |
| Pena Solar de Fênix | 750 | ×1.5 na sinergia do Fervor e libera o upgrade de Relíquias |
| Báculo de Hermes | 1.500 | Custo dos fiéis escala mais devagar (máx. 5) |
| Anel de Draupnir | 2.000 | Geração automática de Relíquias |
| Arca da Aliança Cósmica | 15.000 | Relíquias multiplicam a Fé/s: `(log10(relíquias + 1) + 1)^(nível × 1.2)` (máx. 4) |

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

> **Ainda não implementado:** progresso offline e os 6 satélites da Esfera (por enquanto só ativáveis pelo console via `unlockSphereSatellite(i)`).

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
