# Remodelação do Jogo: Cards de Ações e Sistema de Recursos

Remodelação completa da interface e das mecânicas de progressão do jogo para uma arquitetura baseada em **Cards de Ações**:
1. **Card Menor no Topo Esquerdo ("Recursos")**: Exibe Pontos de Fé e a quantidade de Fiéis (e taxa de produção).
2. **Card Inicial de Ações**: Contém a Esfera Clicável da Entidade Divina e um único botão para **Adquirir fiéis**.
3. **Mecânica Exclusiva de Produção**: Apenas os Fiéis geram Pontos de Fé por segundo.
4. **Card Desbloqueável de Templos (aos 100 Fiéis)**: Ao atingir 100 fiéis, um novo card de ação surge permitindo comprar Templos que multiplicam o ganho por segundo dos fiéis.

---

## Detalhes da Remodelação

### 1. Card de Recursos (Topo Esquerdo Superior)
- Posicionado no canto superior esquerdo com dimensões compactas e design dark glass monocromático.
- Título: `RECURSOS`.
- Conteúdo inicial:
  - **Pontos de FÉ**: Saldo atual formatado (`1 250 PF`), com indicação da taxa passiva (`+10 PF/s`).
  - **Fiéis**: Contagem atual de devotos adquiridos (`10 Fiéis`).
  - Quando os Templos forem desbloqueados, pode exibir também o multiplicador e templos ativos.

### 2. Card Inicial de Ações (A Entidade Divina)
- Card principal em destaque com cantos arredondados, bordas prateadas e iluminação sutil.
- Centraliza a **Esfera Clicável** (`ClickerOrb`) com todos os seus efeitos visuais celestiais (raios geométricos, anel giratório, pulso cósmico e floating numbers ao clicar).
- Abaixo da esfera, um **único botão de ação**:
  - Rótulo: `Adquirir Fiéis` / `+1 Fiel`.
  - Custo em Pontos de Fé dinâmico (com progressão geométrica suave: custo base 15 PF, multiplicador 1.15).
  - Feedback visual de disponibilidade (ativo ou desabilitado conforme saldo de Fé).

### 3. Mecânica de Produção de Fé
- **Geração Manual**: Cada toque/clique na esfera gera Pontos de Fé imediatos.
- **Geração Passiva**: **Apenas os fiéis** geram Pontos de Fé por segundo (1 PF/s base por fiel).
- **Sem outros geradores de base**: Nenhum outro item gera Fé passiva diretamente.

### 4. Novo Card de Ação: Templos Sagrados (Desbloqueio com 100 Fiéis)
- Condição de ativação: Quando a quantidade de fiéis adquiridos for $\ge 100$.
- O card surge dinamicamente ao lado ou na grade de ações com animação suave.
- Conteúdo do card:
  - Título: `TEMPLOS SAGRADOS`.
  - Ilustração/Ícone imponente do templo (`icon_cathedral.png`).
  - Descrição: "Monumentos sagrados dedicados à Entidade que multiplicam a devoção e a Fé gerada por todos os seus fiéis."
  - Indicadores:
    - Quantidade de Templos (`Qtd: X`).
    - Multiplicador ativo dos fiéis (ex: `+100% por templo` $\rightarrow$ 1 Templo = $2\times$, 2 Templos = $3\times$, etc.).
    - Efeito na produção por segundo (ex: `100 PF/s → 200 PF/s`).
  - Botão de compra: `Comprar Templo` / `Construir Templo` com custo em PF (ex: base 5.000 PF).

---

## Proposta de Mudanças nos Componentes

Grouped by component:

### Engine Layer (Lógica e Regras de Negócio)

#### [MODIFY] [types.ts](file:///home/luan/Documents/wmdg/src/engine/types.ts)
- Atualizar definições para suportar a mecânica de multiplicador de Templos sobre os Fiéis.
- Adicionar propriedades ou eventos específicos caso necessário.

#### [MODIFY] [UpgradeManager.ts](file:///home/luan/Documents/wmdg/src/engine/UpgradeManager.ts)
- Configurar os dois itens centrais:
  1. `fiel`: Base cost 15, costMultiplier 1.15, baseOutput 1 PF/s, unlockCost 0.
  2. `templo`: Base cost 5000, costMultiplier 1.6, baseOutput 0, multiplica a produção dos fiéis em $+100\%$ por unidade (fórmula: `1 + templos`).
- Regra de desbloqueio: `templo` é desbloqueado automaticamente quando `fiel.count >= 100`.
- Ajustar `getTotalProductionPerSecond('faith')` para calcular:
  $$\text{Taxa de Fé/s} = \text{Fiéis} \times \text{BaseOutput} \times (1 + \text{Templos})$$
- Garantir que apenas os fiéis produzam Fé passiva.

#### [MODIFY] [GameEngine.ts](file:///home/luan/Documents/wmdg/src/engine/GameEngine.ts)
- Adicionar getters convenientes:
  - `getFiesCount()`: retorna a quantidade de fiéis.
  - `getTemplosCount()`: retorna a quantidade de templos.
  - `getTempleMultiplier()`: retorna o multiplicador atual aplicado aos fiéis.
  - `isTemplesUnlocked()`: verifica se os templos estão disponíveis ($\ge 100$ fiéis).
- Emitir verificação de desbloqueio quando fiéis são adquiridos.

#### [MODIFY] [SaveSystem.ts](file:///home/luan/Documents/wmdg/src/engine/SaveSystem.ts)
- Incrementar versão de save para `V3` com migração transparente dos fiéis salvos, prevenindo conflitos com estruturas anteriores.

---

### View Layer (Componentes Visuais PixiJS)

#### [NEW] [ResourceCard.ts](file:///home/luan/Documents/wmdg/src/view/components/ResourceCard.ts) (ou remodelar)
- Transformar no card compacto **"RECURSOS"** posicionado no topo esquerdo:
  - Título `RECURSOS`.
  - Exibição de **Pontos de FÉ** (`X PF` e `+Y PF/s`).
  - Exibição de **Fiéis** (`Z Fiéis`).
  - Se Templos desbloqueados, indicador do multiplicador dos fiéis (`🏛️ X Templos (Yx)`).

#### [NEW] [ActionCardInitial.ts](file:///home/luan/Documents/wmdg/src/view/components/ActionCardInitial.ts)
- Componente dedicado para o Card Inicial de Ações:
  - Moldura arredondada com estética dark glass monocromática.
  - Cabeçalho: `A ENTIDADE DIVINA`.
  - Contém a esfera clicável (`ClickerOrb`) com todos os seus efeitos interativos.
  - Contém o botão exclusivo `Adquirir Fiéis` com custo em PF, badge de devotos e estado ativo/desabilitado.

#### [NEW] [ActionCardTemples.ts](file:///home/luan/Documents/wmdg/src/view/components/ActionCardTemples.ts)
- Componente dedicado para o Card de Templos:
  - Surge dinamicamente quando a contagem de fiéis atingir 100.
  - Cabeçalho: `TEMPLOS SAGRADOS`.
  - Ícone de catedral/templo com resplendor prateado.
  - Painel de status: Multiplicador atual e impacto no ganho dos fiéis.
  - Botão de compra `Construir Templo` com custo escalonado em PF.

#### [MODIFY] [GameScreen.ts](file:///home/luan/Documents/wmdg/src/view/screens/GameScreen.ts)
- Reorganizar todo o layout da tela:
  - Topo esquerdo: Card `Recursos`.
  - Topo direito: Ações de salvamento (Salvar, Reset) e status de auto-salvamento.
  - Área central / de ações:
    - Card Inicial posicionado com destaque.
    - Card de Templos inserido ao lado quando desbloqueado ($\ge 100$ fiéis).
  - Tratamento responsivo para telas menores / mobile.

---

## Plano de Verificação

### Testes Manuais e Automatizados
1. **Compilação e Verificação TypeScript**:
   - Executar `nix-shell --run "npm run build"` para garantir zero erros de tipagem (`tsc`) e build do Vite com sucesso.
2. **Validação das Regras de Negócio**:
   - **Início do jogo**:
     - Confirmar que o card de Recursos no topo esquerdo mostra apenas Pontos de Fé (0 PF, +0 PF/s) e Fiéis (0 Fiéis).
     - Confirmar que o card inicial contém a esfera clicável e apenas o botão "Adquirir fiéis".
     - Confirmar que o card de Templos **não** está visível.
   - **Cliques manuais**:
     - Clicar na esfera gera Pontos de Fé com feedback numérico flutuante.
   - **Aquisição de Fiéis**:
     - Comprar fiéis deduz Pontos de Fé e incrementa a contagem de fiéis.
     - Confirmar que a geração passiva (+PF/s) é exatamente calculada a partir dos fiéis.
   - **Desbloqueio de Templos aos 100 Fiéis**:
     - Ao adquirir o 100º fiel, verificar se o Card de Templos aparece imediatamente.
     - Comprar Templos e verificar se o ganho por segundo dos fiéis é multiplicado corretamente (ex: de 100 PF/s para 200 PF/s com 1 templo).
3. **Persistência**:
   - Recarregar a página e verificar se os fiéis, templos, fé e status de desbloqueio são preservados corretamente via `SaveSystem`.
