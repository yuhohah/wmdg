# 👁️ A Entidade Divina (Idle Clicker)

Um jogo idle clicker monocromático desenvolvido com **PixiJS v8**, **TypeScript** e **Vite**, focado em estética *dark glass*, alta fluidez e progressão baseada em **Cards de Ações**.

---

## 📖 Sobre o Jogo

Em **A Entidade Divina**, você comanda o culto a uma divindade cósmica ancestral:
1. **Adoração Direta**: Clique na esfera celestial da Entidade para gerar **Pontos de Fé (PF)**.
2. **Aquisição de Fiéis**: Converta devotos fiéis que passam a orar continuamente, gerando Pontos de Fé passivos por segundo (+PF/s).
3. **Desbloqueio de Templos Sagrados**: Ao acumular **100 Fiéis**, um novo card de ação é revelado, permitindo construir templos majestosos que **multiplicam** o ganho por segundo de todos os fiéis (+100% por templo).

---

## ✨ Funcionalidades Principais

- 🌌 **Estética Monocromática**: Paleta *Deep Obsidian*, cinzas sutis, brilho prateado e fontes arredondadas (*Nunito* e *Fredoka*).
- 🎴 **Interface em Cards de Ações**:
  - **Card de Recursos (Topo Esquerdo)**: Exibe seu saldo de Fé, taxa por segundo (+PF/s), quantidade de fiéis e templos ativos.
  - **Card Inicial (A Entidade)**: Contém a esfera clicável com pulso orbital e o botão de aquisição de fiéis.
  - **Card de Templos (Aos 100 Fiéis)**: Surge dinamicamente quando você atinge 100 fiéis para aplicar multiplicadores à devoção.
- 💾 **Salvamento Automático**: Progresso salvo periodicamente no `localStorage`.
- ⏳ **Progresso Offline**: Calcula a Fé acumulada enquanto você esteve ausente (até 24 horas).
- ⚡ **Renderização de Alto Desempenho**: Gráficos e partículas a 60 FPS com PixiJS v8.

---

## 🚀 Como Executar

### Pré-requisitos
- [Node.js](https://nodejs.org/) (v18+) ou [Nix](https://nixos.org/)

### 1. Usando npm diretamente
```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (http://localhost:5173)
npm run dev

# Compilar e verificar tipos para produção
npm run build

# Pré-visualizar build de produção
npm run preview
```

### 2. Usando Nix (`shell.nix`)
```bash
# Entrar no ambiente com Node.js e npm configurados
nix-shell

# Ou rodar o dev server diretamente:
nix-shell --run "npm run dev"
```

Abra **`http://localhost:5173/`** no seu navegador para jogar.

---

## 📁 Estrutura do Projeto

```text
wmdg/
├── public/assets/icons/    # Ícones e sprites celestiais monocromáticos
├── src/
│   ├── engine/             # Lógica e regras de negócio puras
│   │   ├── GameEngine.ts       # Loop principal e orquestrador
│   │   ├── ResourceManager.ts  # Gerenciamento de saldos (Fé)
│   │   ├── UpgradeManager.ts   # Regras de Fiéis e Templos multiplicadores
│   │   ├── SaveSystem.ts       # Persistência no LocalStorage (V3)
│   │   ├── OfflineProgress.ts  # Cálculo de ganhos offline
│   │   └── types.ts            # Tipagens TypeScript
│   ├── view/               # Renderização gráfica com PixiJS
│   │   ├── components/         # Cards de ação, HUD de recursos, orbe, botões
│   │   ├── screens/GameScreen.ts # Composição e layout responsivo
│   │   └── theme.ts            # Tokens de cores e tipografia
│   └── main.ts             # Inicialização do canvas e da aplicação
├── shell.nix               # Configuração do ambiente Nix
├── index.html              # Ponto de entrada HTML e fontes Google Fonts
└── package.json            # Dependências e scripts
```
