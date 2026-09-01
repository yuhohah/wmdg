# Walkthrough: Remodelação do Culto Divino — Cards de Ações & Sistema de Recursos

A remodelação completa do jogo foi implementada com sucesso, adotando uma arquitetura moderna baseada em **Cards de Ações** e centralização da economia em torno dos **Fiéis** e **Templos Sagrados**.

---

## 🏛️ Principais Modificações Realizadas

### 1. Card de Recursos (Canto Superior Esquerdo)
- Arquivo: [`ResourceCard.ts`](file:///home/luan/Documents/wmdg/src/view/components/ResourceCard.ts)
- **Localização**: Fixo no topo esquerdo da interface (`x: 24, y: 18`).
- **Título**: `RECURSOS`.
- **Conteúdo Inicial**:
  - **Pontos de FÉ**: Saldo atual formatado (`0 PF`, `1 500 PF`...) com indicação da taxa por segundo `(+X/s)`.
  - **Fiéis**: Contagem atual de devotos (`0 Fiéis`, `15 Fiéis`...).
- **Expansão Dinâmica**: Quando o jogador constrói templos, o card de Recursos expande suavemente exibindo a quantidade de templos e o multiplicador ativo (`X Templos (2.0x)`).

---

### 2. Card Inicial de Ações (A Entidade Divina)
- Arquivo: [`ActionCardInitial.ts`](file:///home/luan/Documents/wmdg/src/view/components/ActionCardInitial.ts)
- **Localização**: Centralizado na tela (ou lado a lado no desktop).
- **Conteúdo**:
  - Cabeçalho sagrado: `A ENTIDADE DIVINA` / *"Toque na esfera para adorar e gerar Fé"*.
  - **Esfera Clicável (`ClickerOrb`)**: Efeitos visuais etéreos, raios celestiais monocromáticos, anéis giratórios e números flutuantes (`+1 PF`) a cada toque.
  - **Único Botão de Ação**:
    - Rótulo: `Adquirir Fiéis` com badge de custo em PF (`15 PF` base com escalonamento de $1.15^n$).
    - Legenda explicativa: *"Você possui X fiéis (+X PF/s)"*.
    - Estado inteligente: Desabilitado quando não há Fé suficiente, ativando assim que o saldo permite.

---

### 3. Mecânica Exclusiva de Produção
- Arquivo: [`UpgradeManager.ts`](file:///home/luan/Documents/wmdg/src/engine/UpgradeManager.ts)
- **Geração Passiva Exclusiva**: **Apenas os fiéis geram Pontos de Fé por segundo** (1 PF/s base por fiel).
- Nenhum outro upgrade gera Fé passiva independente.

---

### 4. Novo Card de Ação: Templos Sagrados (Desbloqueio com 100 Fiéis)
- Arquivo: [`ActionCardTemples.ts`](file:///home/luan/Documents/wmdg/src/view/components/ActionCardTemples.ts)
- **Condição de Revelação**: O card surge no instante em que o culto atinge **100 Fiéis**.
- **Conteúdo**:
  - Cabeçalho: `TEMPLOS SAGRADOS` / *"Multiplica a Fé gerada pelos seus fiéis"*.
  - Ilustração de catedral cósmica com anéis celestiais em rotação suave e pulso de luz.
  - **Painel de Multiplicador**:
    - Multiplicador ativo em destaque (`Multiplicador: 2.0x`, `3.0x`...).
    - Regra: $+100\%$ por templo ($+1\times$ multiplicador por templo sobre a produção de todos os fiéis).
    - Impacto em tempo real: *"100 fiéis geram: +200 PF/s"*.
  - **Botão de Ação**: `Construir Templo` com custo escalonado em PF (base $2.500\text{ PF}$).

---

### 5. Layout e Persistência
- Arquivos: [`GameScreen.ts`](file:///home/luan/Documents/wmdg/src/view/screens/GameScreen.ts) & [`SaveSystem.ts`](file:///home/luan/Documents/wmdg/src/engine/SaveSystem.ts)
- **Layout Responsivo**:
  - *Desktop*: Antes dos 100 fiéis, o Card Inicial fica elegantemente centralizado. Aos 100 fiéis, os dois cards posicionam-se lado a lado com espaçamento harmonioso.
  - *Mobile*: Organização vertical limpa e adaptativa.
- **Persistência V3**: Atualizado para `IDLE_CLICKER_FAITH_SAVE_V3` com migração transparente dos dados anteriores.

---

## 🧪 Validação dos Resultados

### 1. Testes Automatizados de Regras de Negócio
Executado via script com Node/TypeScript:
- ✅ **Início**: 0 Fé, 0 Fiéis, 0 PF/s, Card de Templos bloqueado.
- ✅ **Toque Manual**: Cada toque na esfera gera +1 PF imediato.
- ✅ **Compra de Fiéis**: Deduz custo e passa a produzir 1 PF/s por fiel.
- ✅ **Marco dos 100 Fiéis**: Desbloqueio imediato do Card de Templos e taxa base de 100 PF/s.
- ✅ **Multiplicador dos Templos**:
  - 1 Templo $\rightarrow$ Multiplicador $2.0\times$ $\rightarrow$ Produção = $200\text{ PF/s}$.
  - 2 Templos $\rightarrow$ Multiplicador $3.0\times$ $\rightarrow$ Produção = $300\text{ PF/s}$.
- ✅ **Salvamento & Recarga**: Fiéis (100), Templos (2) e multiplicador ($3.0\times$) restaurados sem perdas.

### 2. Build de Produção
- `tsc && vite build`: **Sucesso em 2.28s** (0 erros de tipagem, bundle gerado em `dist/`).
- **Servidor Dev Ativo**: Rodando em **`http://localhost:5173/`**.
