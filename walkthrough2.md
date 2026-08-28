# Walkthrough: Culto à Entidade Divina (Idle Clicker)

Todas as alterações de design, tema e progressão foram implementadas com sucesso:

---

## 🔮 Principais Alterações Implementadas

### 1. Novo Tema & Nomenclatura
- **Orbe Clicável $\rightarrow$ A Entidade Divina / Deus**:
  - Ícone celestial místico com raios dourados e anel celestial animado em [`ClickerOrb.ts`](file:///home/luan/Documents/wmdg/src/view/components/ClickerOrb.ts).
  - Feedback interativo: *"TOQUE PARA ADORAR E GERAR FÉ"*.
- **Moedas $\rightarrow$ Pontos de Fé (PF)**:
  - Sistema de pontuação exibido com o símbolo `✨` e contagem `X PF` e `+X PF/s` em [`ResourceCard.ts`](file:///home/luan/Documents/wmdg/src/view/components/ResourceCard.ts).
  - Partículas de feedback de clique (`FloatingTextManager.ts`) exibindo `+X PF` flutuando dinamicamente.

---

### 2. Mecânica de Itens por Quantidade e Progressão
- **Sem Níveis $\rightarrow$ Apenas Quantidade (`Qtd: X`)**:
  - Os cartões de compra em [`UpgradeCard.ts`](file:///home/luan/Documents/wmdg/src/view/components/UpgradeCard.ts) agora mostram a quantidade total possuída (`Qtd: 0`, `Qtd: 1`...) em vez de níveis.
- **Item Inicial Único $\rightarrow$ Fiéis (`🙏 Fiéis`)**:
  - Inicialmente, **apenas "Fiéis"** está disponível na lista de compras (`unlockCost: 0`).
  - Cada Fiel ora continuamente gerando `+1 PF/s`.
- **Desbloqueio Progressivo do Toque $\rightarrow$ Prece Fervorosa (`✨ Prece Fervorosa`)**:
  - O item para aumentar o valor do clique manual é desbloqueado após atingir o marco de Fé necessário (`unlockCost: 80 PF`).
- **Novas Estruturas Sagradas Desbloqueáveis**:
  - `🏛️ Santuários` (Desbloqueado com 300 PF, produz `+8 PF/s`)
  - `⛪ Templos Majestosos` (Desbloqueado com 1.800 PF, produz `+45 PF/s`)
  - `🏰 Mosteiro Celestial` (Desbloqueado com 12.000 PF, produz `+260 PF/s`)
  - `🌟 Milagres Manifestados` (Desbloqueado com 85.000 PF, produz `+1.600 PF/s`)

---

## 🛠️ Verificação e Build

- **TypeScript (`tsc --noEmit`)**: 0 erros de tipagem.
- **Vite Production Build**: Compilado com sucesso em 5.55s.
- **Servidor Dev**: Rodando em `http://localhost:5173/`.
