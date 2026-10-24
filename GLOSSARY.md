# Glossary

**A Esfera**
The central deity and playable entity in *Cult of the Sphere*: a Hermetic sphere whose center is everywhere and whose circumference is nowhere. Clicking the Esfera inside the central Relicário (`Altar da Esfera`) channels **Fé** directly from mortal minds.

**Fiel Devoto**
The cult's base generator of passive **Fé** (`+1 Fé/s` base before multipliers). Up to 35 active devotees are visibly rendered walking and praying in the `Pátio dos Fiéis` (`FollowersArena`). Recruiting 25 devotees (or unlocking `Memória Hermética` in the Gnose tree) unlocks the **Converter Máximo** button.

**Pedido de Milagre (Miracle Plea)**
Periodically (~35–65 s when at least one devotee is in the courtyard), a devotee in the `Pátio dos Fiéis` enters a prayer state with a glowing golden speech bubble for 15 s. Clicking the bubble grants a miracle worth $\max(30, 15 \times \text{Fé por Clique}, \lfloor 30 \times \text{Fé/s} + 10\% \text{Fé Atual} \rfloor)$.

**Selos Sagrados**
The four sequential mechanic unlocks purchased with **Fé** via the central `Desbloqueio` portal:
1. **Selo da Encarnação** (`200 Fé`): Ignites **Fervor** (`+1/s` base) and opens the `Encarnação Sagrada` card.
2. **Selo do Fervor** (`5.000 Fé`): Opens the `Fervor Sagrado` card with the **Ritos de Fervor**.
3. **Selo das Relíquias** (`20M Fé`): Opens the `Opus Magnum` (`Relíquias`) card and starts passive **Fragmentos** generation.
4. **Selo da Gnose** (`1Q` / `1e15 Fé`): Opens the `Câmara da Gnose` (`True Prestige`) card.

**Encarnação Sagrada (Avatar)**
The divine manifestation on the `Altar da Encarnação` (`IncarnationAltar`), evolving across 5 stages (`Avatar Neófito`, `Avatar Consagrado`, `Avatar Ancestral`, `Avatar do Eclipse`, `Avatar Solar`). Advancing stages multiplies **Fervor/s** (`1× → 100× → 10.000× → 10⁸× → 10¹⁵×`) and scales the follower multiplier (`1 + log10(1 + Fervor / 150) × 1.5 × Estágio`).

**Bênção 2× Fé**
Activated by clicking the `Altar da Encarnação` inside the `Encarnação Sagrada` card. Each click adds `+2 s` of doubled **Fé/s** (`2×`), up to `60 s` stored (`BLESSING_MAX_SECONDS`). Unlocking `Vigília Perpétua` (`gn_bencao_eterna`) in the Gnose tree keeps the 2× Blessing permanently active at maximum charge.

**Fervor & Ritos de Fervor**
The secondary resource generated once the `Selo da Encarnação` is broken. Accumulated **Fervor** passively multiplies all **Fé** (`(log10(Fervor / 10 + 1) × 2 + 1) × efeito`) and feeds the `Encarnação` follower multiplier. Spent on 6 **Ritos de Fervor** (`fu_prod`, `fu_effect`, `fu_click`, `fu_followers`, `fu_synergy`, and `fu_relics` once `Pena Solar de Fênix` is restored).

**Fragmentos & Relíquias (Opus Magnum)**
The first prestige layer, unlocked by the `Selo das Relíquias`. Performing a **Transmutação** resets current **Fé** (with a 3 s cooldown) in exchange for `floor(log2(Fé + 1) × bônus)` **Fragmentos**, plus passive generation (`max(1, floor(melhorTransmutação / 10))` Fragmentos/s and percentage bonuses from `Anel Divino de Draupnir`, `Cripta Eterna`, and `Transmutação Espontânea`). Fragmentos restore 6 mythological **Relíquias**.

**Gnose & Árvore Hermética**
The true prestige currency unlocked by the `Selo da Gnose` (`1e15` Fé). Performing an **Ascensão Gnóstica** dissolves the earthly cult (Fé, Fiéis, Fervor, Ritos de Fervor, Estágio da Encarnação, Fragmentos, Relíquias, and the earlier Selos unless preserved by `Memória Hermética` or `Cripta Eterna`) in exchange for **Gnose** (`floor(((Fé / 1e15) ^ 0.15) * mult)`). Total Gnose earned grants a permanent passive multiplier (`1 + TotalGnose^0.85 * 1.5`) so spending Gnose on the **20-node Hermetic Tree** across 4 tiers (`I. Despertar Gnóstico`, `II. Persistência & Sinergia`, `III. Evoluções Herméticas`, `IV. Automação & Apoteose`) never lowers production.
