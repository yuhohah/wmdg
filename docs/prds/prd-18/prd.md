<!-- Snapshot of https://github.com/yuhohah/wmdg/issues/18 -->
Source: https://github.com/yuhohah/wmdg/issues/18

# Main screen: restorable church hub with evolving protagonist (O Escolhido → O Profeta)

## Problem Statement

The game opens on a procession: a hooded red prophet leads cultists down a road. That doesn't fit the start of the story. At the beginning the protagonist isn't a cultist yet, has no followers, and has nowhere to worship. The main screen also shows nothing of the cult's growth. Buying Selos, gaining followers and advancing Encarnação stages change numbers, not the world. The Encarnação tab draws a separate avatar the player clicks for the Bênção boost, which pulls that action away from the main interaction with the Esfera.

## Solution

The main screen becomes a side view, at dusk, of a ruined church / cult center. The church is restored as the cult grows, and the protagonist changes as they advance through Encarnação.

- The protagonist starts as **O Escolhido**: a white-robed, brown-haired youth with praying hands. This is the leftmost figure in the reference art attached to this issue's originating conversation, the same style as the existing procession sprites.
- From Encarnação stage I onward they are **O Profeta**. Their look changes at each stage, reaching the hooded red prophet at stage IV (Eclipse) and a radiant version at stage V (Solar).
- The church moves through 4 major tiers, one per Selo. Follower-count thresholds add small details, such as torches and pews.
- The Esfera starts as a faint glow among the ruins, then sits on the altar from tier 1 onward.
- Followers fill 12 fixed spots around the church. Beyond that, a crowd of silhouettes grows denser.
- The Bênção boost moves to a small button under the Esfera. The Encarnação tab keeps only the stage list and upgrades.
- The procession leaves the main screen. It stays available through `?art-review` until it comes back later as a boss-battle mechanic.

## User Stories

1. As a new player, I want to start as a humble youth (O Escolhido) rather than a cult leader, so that the story begins before the cult exists.
2. As a new player, I want to see a partially destroyed church as my home, so that I understand I am rebuilding something lost.
3. As a new player, I want the Esfera to show as a faint glow among the ruins, so that it feels like I discovered a sealed god.
4. As a player, I want clicking the Esfera to stay the main way I generate Fé, so that the core loop doesn't change.
5. As a player who buys the Selo da Encarnação, I want the rubble cleared and a makeshift altar to appear, so that my first big purchase visibly changes the world.
6. As a player who buys the Selo da Encarnação, I want the Esfera to move onto the altar, so that it becomes the object of worship.
7. As a player who buys the Selo da Encarnação, I want my character to become O Profeta, so that I see I have accepted the role.
8. As a player who buys the Selo do Fervor, I want the roof and walls repaired and candles lit, so that my progress is visible.
9. As a player who buys the Selo das Relíquias, I want the church fully restored with a bell tower, stained glass and banners, so that reaching prestige feels monumental.
10. As a player, I want each church upgrade to play a short transition (fade/dust plus a sparkle on the changed parts), so that the moment feels earned.
11. As a player, I want a notification that names each restoration (for example "O telhado foi restaurado"), so that I know what changed and why.
12. As a player, I want the church's own light to grow with each tier (dark windows, then candles, then glowing stained glass) while the dusk sky stays the same, so that progress is visible and the HUD stays readable.
13. As a player reaching 10, 25, 50, 100 and 250 followers, I want small details to appear (torches, pews, a garden, a cult banner, a statue of the Esfera), so that follower growth changes the scene between Selos.
14. As a player, I want each Encarnação stage to change the protagonist's look step by step, so that buying stages feels like transformation and not only a multiplier.
15. As a player reaching Encarnação stage IV (Eclipse), I want the protagonist to become the hooded red prophet with a shadowed face, so that the dark peak of the story is clear.
16. As a player reaching Encarnação stage V (Solar), I want a radiant version of the prophet, so that the Dark → Light arc ends in something beyond the hooded look.
17. As a player, I want the protagonist to have an idle animation (breathing, and praying hands as O Escolhido), so that the scene feels alive.
18. As a player, I want my followers to appear around the church, standing and praying with idle animations, so that I see the people I have converted.
19. As a player, I want followers to fill fixed spots in a set, pleasing order, so that the scene fills in nicely instead of randomly.
20. As a player with more than 12 followers, I want a background crowd that gets denser at 50 / 250 / 1k / 10k followers, so that very large numbers still show without clutter.
21. As a player, I want miracle requests to come from a visible follower in the church yard, so that the miracle mechanic still makes sense on the new screen.
22. As a player who has bought the Selo da Encarnação, I want a small Bênção button under the Esfera, so that I can trigger the 2× boost right where I am already clicking.
23. As a player, I want the Bênção button to show the stored seconds (0–60) as a draining fill and a label like "✦ 2× · 34s", so that I know how much boost is left.
24. As a keyboard player, I want to trigger the Bênção button with Enter or Space, so that it is accessible.
25. As a player, I want the Bênção button to give the same pulse feedback as clicking the Esfera, so that it feels part of the same interaction.
26. As a player before the Selo da Encarnação, I want the Bênção button hidden, so that I am not shown something I can't use yet.
27. As a player opening the Encarnação tab, I want to see only the stage list and upgrades (no avatar), so that the tab is focused and the protagonist lives only on the main screen.
28. As a player loading a save, I want the church tier, details, crowd and protagonist look to match my current progress straight away with no transitions replayed, so that loading feels seamless.
29. As the developer, I want the procession scene reachable only through `?art-review`, so that I keep the work for the future boss battle without it showing to players.
30. As the developer, I want `?art-review` controls to step through church tiers, protagonist looks, follower counts and crowd density, so that I can review the art without playing to each milestone.
31. As the developer, I want the detail thresholds and crowd thresholds in one config file, so that I can tune them against the progression balance without touching scene code.
32. As the developer, I want all new sprites made with PixelLab (via executor) on the existing 64×72 canvas with the same feet line, so that the new art matches the existing follower sprites.
33. As the developer, I want each tier background generated by editing the previous one, so that the church composition lines up across tiers.
34. As the developer, I want "O Escolhido" and "O Profeta" defined in the glossary, so that the protagonist's names are used consistently.

## Implementation Decisions

- **Church scene description (a pure function and the single test seam).** It takes a small snapshot of game state:
  - which of the three Selos are unlocked (`unlock_incarnation`, `unlock_fervor_upgrades`, `unlock_relics`)
  - the current Encarnação stage
  - the follower count
  - the remaining Bênção boost seconds

  It returns a plain description of what the screen shows:
  - church tier (0–3)
  - the set of unlocked details
  - crowd density level
  - number of filled follower spots (max 12)
  - protagonist look (0–5)
  - protagonist label ("O Escolhido" / "O Profeta")
  - where the Esfera is (`ruins` / `altar`)
  - whether the Bênção button shows, and its fill fraction
- **Protagonist look mapping.** Look 0 (O Escolhido) applies whenever the Selo da Encarnação is *not* unlocked. The game state's Encarnação stage defaults to 1 even before the Selo, so the stage number alone can't be used. Once the Selo is unlocked, look = Encarnação stage (1–5). Stage IV is the existing hooded red prophet look and stage V is the radiant version.
- **Church tier mapping:**
  - Tier 0: ruin.
  - Tier 1: Selo da Encarnação (rubble cleared, makeshift altar, Esfera moves to the altar).
  - Tier 2: Selo do Fervor (roof and walls, candles).
  - Tier 3: Selo das Relíquias (full restoration: bell tower, stained glass, banners).

  The Esfera is in the ruins at tier 0 and on the altar from tier 1 onward.
- **Transitions and notifications** come from comparing the previous scene description with the next one. A tier increase, a newly unlocked detail or a new protagonist look triggers the matching transition and a named notification. On first load the scene is built straight from the description with no transitions.
- **No new stored state.** Tier, details, crowd and look are always derived from existing game state. Nothing new is saved (this is greenfield, so there is no save migration).
- **Church config module.** It holds:
  - detail thresholds by follower count: torches 10, pews 25, garden 50, cult banner 100, Esfera statue 250. These are placeholders, to be tuned against the progression balance doc.
  - crowd density thresholds: 50 / 250 / 1k / 10k
  - the order of the 12 follower spots
  - restoration notification texts (PT-BR)
- **Church scene renderer** (replaces the procession as the main gameplay scene). It draws:
  - the tier background (one full image per tier, the same composition)
  - the detail prop sprites as overlays
  - the crowd silhouette layer (silhouettes generated once, tiled with a fixed random seed, denser per level)
  - followers in the 12 fixed spots, each using one of the 9 existing follower identities with a new idle/pray loop
  - the protagonist idle loop for the current look
  - the clickable Esfera
  - the Bênção button

  It subscribes to the existing event bus (state changed, Fé changed, miracle plea/granted) the same way the procession scene does now. Miracle requests attach to a visible follower.
- **Bênção button.** A small pixel-art button under the Esfera, shown only after the Selo da Encarnação. Each press adds the existing +2 s to the boost (max 60 s), the same as the current avatar click. It shows a draining fill and the remaining seconds, can be used from the keyboard, and gives the same pulse feedback as clicking the Esfera.
- **Encarnação tab.** The avatar canvas (`IncarnationArena`: canvas, click handling, styles) is deleted. The tab keeps only the stage list and upgrades.
- **Procession scene.** Taken off the main screen. Its code and assets stay, mounted only in `?art-review` mode. It will be reused for the future boss-battle mechanic.
- **Art-review mode** gains controls to step through church tiers 0–3, protagonist looks 0–5, follower counts and crowd levels.
- **Art pipeline.** All sprites come from PixelLab via executor and are recorded in a manifest, following the existing walk-cycle manifest:
  - **Protagonist:** 6 looks on the 64×72 canvas with the feet line matching the existing sprites. Look 0 is based on the reference image's leftmost figure, and each later look is generated from the previous one so they stay consistent. Each look gets an idle loop.
  - **Followers:** 9 idle/pray loops, one per existing follower.
  - **Church:** 4 tier backgrounds, each produced by editing the previous one.
  - **Props:** sprites for the 5 details.
  - **Crowd:** a silhouette sheet.
- **Glossary.** Add **O Escolhido** (the protagonist before the Selo da Encarnação) and **O Profeta** (the protagonist from Encarnação stage I onward). Also add **Church tier** and **Detail** if they don't already exist.
- **Visual direction.** Pixel art at dusk/night matching the reference image. The sky stays the same, and only the church's own lighting grows with each tier.

## Testing Decisions

- Add Vitest as the test runner (it fits the existing Vite setup). The repo has no tests yet, so there is no prior art.
- Test only through the church scene description function, by feeding state snapshots and checking the returned description. Don't test rendering details, DOM structure or private helpers.
- Cases to cover:
  - Without the Selo da Encarnação: look 0, label "O Escolhido", Esfera in `ruins`, tier 0, Bênção hidden, even though the Encarnação stage reads 1.
  - With the Selo da Encarnação: look matches stages 1–5, label "O Profeta", Esfera on `altar`, tier 1, Bênção visible.
  - Tier increases with each Selo. Test them in combination, for example relics unlocked without fervor if the state allows it; tier is the count of Selos in order.
  - Follower thresholds unlock details exactly at 10/25/50/100/250 (at the threshold and one below it).
  - Filled spots = min(followers, 12). Crowd level steps at 50/250/1k/10k.
  - Bênção fill fraction = seconds / 60, clamped to 0–1.
  - Comparing descriptions: going from one description to the next reports exactly the tier change, the new details and the look change that happened, and reports nothing when nothing changed.
- Check rendering, transitions and art by hand through `?art-review`.

## Out of Scope

- The boss-battle mechanic and bringing the procession back into it.
- Follower work animations (carrying stones, ringing bells, tending candles). Followers only idle and pray in this pass.
- A scrolling or expanding view of the grounds, or an interior view of the church.
- A new resource or a purchasable restoration line. Restoration is driven only by existing milestones.
- Rebalancing Selos, Encarnação costs or follower costs.
- Day/night cycles or changing the sky.

## Further Notes

- The reference image comes from the design conversation. Its leftmost character (white robe, brown hair, praying hands) defines O Escolhido. The existing `prophet` sprite defines the stage IV look.
- The current procession places the Esfera above the prophet's head. On the new screen it lives in the ruins, then on the altar.
- The thresholds are placeholders and should be checked against the progression balance doc before release.

