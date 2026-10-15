---
name: dark-hermetic-art
description: Generate and standardize production-ready 2D game assets for 'A Entidade Divina' based on Renaissance Hermetic Engravings, 16th-century woodcuts, astronomical armillary diagrams, and occult alchemy treatises. Use whenever creating or refining visuals, sprites, backgrounds, or UI icons for the game engine.
---

# 📜 Hermetic Engraving & Renaissance Cosmography Art Skill

This skill governs the visual identity, art direction, and prompt architecture for **A Entidade Divina**, drawing direct canonical inspiration from **Renaissance Hermetic treatises, 16th/17th-century copperplate etchings, astronomical woodcuts, and alchemical cosmographies** (in the tradition of Albrecht Dürer, Robert Fludd, Athanasius Kircher, and Peter Apian).

---

## 1. Visual Foundation: The Renaissance Occult Woodcut

All generated assets are conceived as **living antique woodcut engravings and alchemical diagrammatic etchings**, rather than modern generic digital paintings or 3D renders.

### Canonical Visual Attributes
* **Medium**: Antique Woodcut Print, Vintage Copperplate Etching, Alchemical Woodblock Engraving.
* **Technique & Mark-Making**:
  * Precision contour linework.
  * Meticulous parallel hatching and dense cross-hatching for depth and volume.
  * Stippling and textured engraving burr.
  * Aged antique paper grain, stone plate transfer, and chiselled bas-relief edges.
* **Tonal Philosophy (Monochrome & Chiaroscuro)**:
  * **Primary Palette**: Deep soot black (`#090A0F`), charcoal, bone-white, aged parchment (`#C5C6C7`, `#E2E8F0`), and slate lead.
  * **Inversion Rule**: Assets can be presented in **Classical Treatise Mode** (crisp dark soot ink on aged ash/stone paper) or **Nocturnal Void Mode** (chiselled bone-white and silver linework glowing against a pitch-black obsidian void).
  * **Accent Color (Strict 5% Rule)**: Faint single-hue alchemical tint if needed (e.g. ethereal silver-violet wash, antique tarnished gold foil, or faint dried crimson ink).

### Structural Motifs (The Armillary & Cosmographic Lexicon)
* **The Celestial Sphere**: Armillary rings, meridian arcs, latitude/longitude colure grids, equatorial bands.
* **Celestial Wind Personifications (Anemoi / Venti)**: Clouds, blowing cherub/sage heads positioned along the perimeter emitting straight rays of astral breath.
* **Sacred Epigraphy**: Romanesque Latin epigraphy, astrological signs, concentric alchemical seals, mathematical proportion compasses, unclosed planetary orbits.

---

## 2. Hard Engine Vetos

* ❌ **NO modern digital gradients, 3D CGI plastic glossy renders, or Unreal Engine shaders.**
* ❌ **NO cartoon, anime, chibi, or playful mobile game styles.**
* ❌ **NO vibrant rainbow colors or noisy neon particle spam.**
* ❌ **NO blurry, out-of-focus brushstrokes — all forms must be defined by clear engraved linework and hatching.**

---

## 3. Game Asset Categories & Technical Rules

### A. The Divine Entity & Interactive Core (Armillary Sphere)
* **Visual Anchor**: Centered celestial globe embraced by intersecting orbital brass/stone armillary rings, meridian bands, and perimeter astral winds.
* **Format**: Exact `1:1` square, centered circular silhouette on pure black (`#000000`) or clean parchment cutout.
* **Engine Use**: Direct mapping to `#divine-sphere-btn` and orbit satellite nodes (`.sphere-orbit-ring`, `.sphere-satellite-node`).

### B. Character Sprites & Spritesheets (Devotees & Cultists)
* **Format**: Uniform horizontal sprite grids on solid pure black (`#000000`).
* **Linework**: Cross-hatched ascetic figures with Dürer-style draped folds in coarse burlap tunics, rope belts, and gaunt etched faces.
* **Projection**: Strict **Orthographic Side-View Profile** with feet anchored to a uniform horizontal baseline for clean slicing in `followersArena.ts`.
* **Lighting**: Symmetrical ambient engraving lighting to allow horizontal flipping (`scale.x = -1`).

### C. Playable Arenas & Architectural Backgrounds
* **Arena Floors (`16:9`)**: Flat, low-noise perspective plane composed of etched stone flagstones with concentric hermetic seals, leaving the walkable area clean for moving sprites.
* **Scenic Panoramas (`16:9`)**: Vaulted cathedral vaults, astronomical observatories, and mountain shrines rendered in sweeping architectural engraving lines.

### D. UI Icons & Milestone Cards
* **Format**: `1:1` circular medals, alchemical glyphs, or seal stamps with high silhouette contrast legible at 64x64px.

---

## 4. Prompt Engineering Templates

When generating assets, use these specialized prompt formulas:

### 🌌 Template 1: The Divine Armillary Entity (Interactive Orb)
```text
Antique 16th-century hermetic woodcut engraving of an eldritch celestial armillary sphere deity, style of Albrecht Dürer, Robert Fludd, and Peter Apian cosmography treatise. 
A centered monumental celestial globe with fine meridian coordinate grid lines, encircled by intersecting concentric orbital rings and astrolabe brass bands. 
Surrounded along the outer orbit by etched personifications of celestial winds blowing straight rays of astral breath toward the central orb. 
Intricate cross-hatching, copperplate etching linework, stippling, deep soot black ink and bone-ash silver tones, dramatic chiaroscuro contrast, isolated on solid pure black background #000000, 1:1 square ratio, clean 2D game asset sprite.
```

### 👥 Template 2: Devotee / Cultist Spritesheet
```text
2D game character spritesheet of an ascetic hermetic devotee worshipper, 16th-century antique woodcut engraving style, Albrecht Dürer cross-hatching linework. 
2D sprite sheet layout with 2 horizontal rows on solid pure black background #000000. 
Row 1: 6 sequential walking cycle animation frames in strict orthographic side view profile, feet grounded on a uniform horizontal baseline. 
Row 2: 6 sequential kneeling and praying animation frames with clasped hands. 
Humble gaunt peasant wearing coarse frayed burlap robes, rope belt, etched cloth folds, fine hatching shadows, no floor shadows, high contrast game sprite grid.
```

### 🏛️ Template 3: Playable Arena / Courtyard Floor
```text
Playable 2D game arena floor background of an ancient hermetic temple courtyard, 16th-century architectural copperplate engraving and woodcut style. 
Wide 16:9 perspective. Lower 60% features a wide flat walkable surface of engraved cracked slate flagstones inlaid with large concentric geometric armillary seals and alchemical astrological circles. 
Upper 40% features towering etched stone pillars and vaulted arches under a dark starry celestial sphere sky with astronomical coordinate lines. 
Low visual clutter on the floor, high contrast monochrome soot and bone-ash parchment tones.
```

### 📜 Template 4: UI Relic & Seal Icon
```text
Centered 2D game UI icon of an ancient hermetic alchemical seal talisman, 16th-century Renaissance woodblock print style. 
Crisp circular medallion with etched sacred geometry, planetary sigils, and Latin inscriptions. 
High silhouette contrast, bold engraved linework, cross-hatching depth, isolated on solid dark background, clean game icon border.
```

### ⛔ Universal Negative Prompt
```text
modern digital painting, 3d render, cgi, smooth plastic, photorealistic photo, anime, cartoon, vibrant rainbow colors, saturated neon, blurry airbrush, contemporary clothes, white frame padding
```

---

## 5. Execution Protocol

1. **Verify Canonical Reference**: Calibrate linework, hatching density, and cosmological motifs against the historical armillary woodcut reference.
2. **Select Asset Template**: Deploy the appropriate template (Entity, Spritesheet, Arena, or Icon).
3. **Generate with Strict Aspect Ratios**: Execute via `generate_image` using matching proportions (`1:1` or `16:9`).
4. **Deploy to Engine Assets**: Copy to `public/assets/` ensuring seamless compatibility with PixiJS canvas rendering and CSS styling.
