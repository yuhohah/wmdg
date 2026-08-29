# Walkthrough: Aprimoramento do Templo e Card de Monumentos Ancestrais

Todos os novos sistemas e mecânicas foram implementados e validados com 100% de sucesso:

---

## 🏛️ 1. Aprimoramento do Templo Sagrado (com PF)

- **Arquivo**: [`UpgradeManager.ts`](file:///home/luan/Documents/wmdg/src/engine/UpgradeManager.ts) & [`ActionCardTemples.ts`](file:///home/luan/Documents/wmdg/src/view/components/ActionCardTemples.ts)
- **Custo Inicial**: **10.000 Pontos de Fé (PF)**.
- **Escala de 10 Níveis**:
  - Nível 1: 10.000 PF (Ouro x2)
  - Nível 2: 22.000 PF (Ouro x4)
  - Nível 3: 48.400 PF (Ouro x8)
  - Nível 4: 106.480 PF (Ouro x16)
  - Nível 5: 234.256 PF (Ouro x32)
  - Nível 6: 515.363 PF (Ouro x64)
  - Nível 7: 1.133.799 PF (Ouro x128)
  - Nível 8: 2.494.357 PF (Ouro x256)
  - Nível 9: 5.487.587 PF (Ouro x512)
  - Nível 10: 12.072.692 PF (Ouro x1024)
- **Efeito**: A taxa base de Ouro gerada pelo Templo dobra a cada nível (`2^nível`), escalando de ~2.5 Ouro/s até mais de **2.560 Ouro/s** no nível 10!
- **Interface**:
  - Botão interativo no card do templo exibindo: `APRIMORAR TEMPLO (Nv. X/10)` e o custo dinâmico.
  - Ao atingir o nível 10, o botão trava com louvor: `TEMPLO NO NÍVEL MÁXIMO (10/10)`.

---

## 🗿 2. Card de Monumentos Ancestrais (7 Monumentos)

- **Arquivo**: [`ActionCardMonuments.ts`](file:///home/luan/Documents/wmdg/src/view/components/ActionCardMonuments.ts)
- **Condição de Desbloqueio**: O card é revelado assim que o culto atinge **10.000 de Ouro**.
- **Custo Inicial do 1º Monumento**: **100.000 de Ouro**.
- **Os 7 Monumentos Míticos**:
  1. **Monólito da Aurora** (100.000 Ouro) — *+100% Produção Global*
  2. **Obelisco da Eternidade** (350.000 Ouro) — *+150% Fé dos Fiéis*
  3. **Torre dos Céus** (1.200.000 Ouro) — *+200% Ouro dos Templos*
  4. **Pirâmide da Ascensão** (5.000.000 Ouro) — *+300% Fé por Toque*
  5. **Colosso da Devoção** (25.000.000 Ouro) — *+400% Produção Global*
  6. **Farol Cósmico** (150.000.000 Ouro) — *+500% Todos os Recursos*
  7. **Trono Divino** (1.000.000.000 Ouro) — *+1000% Multiplicador Universal*
- **Aparência do Card**:
  - Emblema central monumental de alta resolução gerado sob medida.
  - Animação de anéis rúnicos e pulso de luz etéreo.
  - Indicador visual inferior com 7 glifos/esferas que se iluminam à medida que cada monumento é erguido.
  - Botão grande e imponente para despertar o próximo monumento.

![Ícone do Monumento Ancestral](/home/luan/.gemini/antigravity-ide/brain/35db7590-56d9-43ac-b86d-e493dc6cc870/icon_monument_1787960540867.jpg)

---

## 📊 3. Integração do HUD e Layout Responsivo

- **Card de Recursos** ([`ResourceCard.ts`](file:///home/luan/Documents/wmdg/src/view/components/ResourceCard.ts)):
  - Nova linha exibindo o progresso dos Monumentos: `X/7 Monumentos` com ícone personalizado.
- **Tela Principal** ([`GameScreen.ts`](file:///home/luan/Documents/wmdg/src/view/screens/GameScreen.ts)):
  - Posicionamento inteligente para até 3 action cards simultâneos:
    - **Telas Grandes (≥ 1180px)**: 3 cards lado a lado perfeitamente alinhados (`A Entidade Divina`, `Templo Sagrado` e `Monumentos Ancestrais`).
    - **Telas Médias (780px - 1179px)**: 2 cards na primeira linha e o 3º card centralizado abaixo.
    - **Telas Mobile (< 780px)**: Empilhamento vertical fluido.
  - Botão de Reset Total apaga e zera todos os níveis de templo e monumentos instantaneamente.

---

## 🧪 Validação dos Testes

- ✅ **Aprimoramento do Templo**:
  - Custo inicial verificado em exatamente 10.000 PF.
  - Testados com sucesso todos os 10 níveis, confirmando que a geração de ouro dobra a cada nível.
  - Bloqueio confirmado no nível 10.
- ✅ **Desbloqueio dos Monumentos**:
  - Confirmado desbloqueio estritamente aos 10.000 de Ouro.
- ✅ **Construção dos 7 Monumentos**:
  - 1º monumento verificado ao custo de 100.000 de Ouro.
  - Todos os 7 monumentos erguidos em progressão sequencial com dedução exata de Ouro.
  - Bloqueio após o 7º monumento confirmado.
- ✅ **Reset Total**:
  - Nível do templo volta a 0, monumentos voltam a 0 e card bloqueado.
- ✅ **Build de Produção**: `tsc && vite build` finalizado com **0 erros**.
- ✅ **Servidor Dev Ativo**: `http://localhost:5173/`.
