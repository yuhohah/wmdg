# Walkthrough: Culto à Entidade Divina (Monochrome & Rounded Edition)

O template foi totalmente renovado para um design **Monocromático (Preto, Branco e Prata)** de alto contraste e elegância, acompanhado de **tipografia com cantos arredondados** otimizada para legibilidade numérica.

---

## 🎨 Principais Mudanças Visuais

### 1. Espectro Preto & Branco (Monochrome)
- **Paleta de Cores em [`theme.ts`](file:///home/luan/Documents/wmdg/src/view/theme.ts)**:
  - Fundo: Deep Obsidian (`#050505`) com iluminação radial sutil.
  - Painéis & Cards: Dark Glass (`#0d0d0d` / `#121212`) com bordas em prata e grafite (`#262626` / `#404040`).
  - Textos & Números: Branco Puro (`#FFFFFF`) e Prata Luminescente (`#F5F5F5` / `#D4D4D8`).
- **A Entidade Divina / Deus**:
  - Halo etéreo em luz prateada e anéis celestiais brancos brilhantes em [`ClickerOrb.ts`](file:///home/luan/Documents/wmdg/src/view/components/ClickerOrb.ts).
- **Botões & Badges**:
  - Botões de aquisição em branco puro com texto em preto de alto contraste.
  - Badges de quantidade (`Qtd: X`) com borda prateada e cantos suaves.
- **Partículas de Fundo & Floating Text**:
  - Estrelas cintilantes e números de clique (`+1 PF`, `+10 PF`) com visual branco nítido.

---

### 🔤 2. Nova Tipografia com Cantos Arredondados
- Fontes integradas via Google Fonts em [`index.html`](file:///home/luan/Documents/wmdg/index.html):
  - **`Fredoka` + `Nunito`**: Fontes geométricas com vértices e terminais suavemente arredondados, projetadas para manter clareza e estética limpa tanto em números grandes quanto em notação científica (`1 500`, `999 999 999`, `1.2e9`, `1e10`).
  - **`JetBrains Mono`**: Utilizado em elementos de precisão secundários.

---

## 🛠️ Status da Compilação e Execução
- **TypeScript**: `0` erros.
- **Production Build**: Sucesso em 5.82s.
- **Servidor Dev Ativo**: Acesse em **`http://localhost:5173/`**.
