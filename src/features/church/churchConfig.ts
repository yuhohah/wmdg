/** Church-yard tuning, kept apart from scene code. Positions are in tier-art pixels. */
export const STAGE_SIZE = { width: 400, height: 192 } as const;

/** A place in the yard; `feet` is the ground line under the sprite. */
export interface YardPoint {
  x: number;
  feet: number;
}

export interface FollowerSpot extends YardPoint {
  /** Which of the 9 follower identities (0–8) stands here. */
  follower: number;
}

/**
 * The slice of the stage that is on screen on the narrowest supported phone, in tier-art pixels.
 * Measured on the church world at 412×915, where the stage is cropped to x 94–306; 6 px less on each side
 * keeps clear of the wood frame. Wider phones and desktops show more. Vertically the stage is cropped from
 * the top first, so art down to y 152 is always visible (see `.church-stage`); spots and the stand stay above it.
 */
export const ALWAYS_VISIBLE_X = { from: 100, to: 300 } as const;

/**
 * Fill order: the first converts gather in front of the door, later ones fill out two rows along the hill top,
 * all inside `ALWAYS_VISIBLE_X` and right of x 214, leaving the gap beside the altar free.
 */
export const FOLLOWER_SPOTS: readonly FollowerSpot[] = [
  { x: 215, feet: 147, follower: 0 },
  { x: 222, feet: 141, follower: 1 },
  { x: 229, feet: 147, follower: 2 },
  { x: 237, feet: 141, follower: 3 },
  { x: 244, feet: 147, follower: 4 },
  { x: 251, feet: 141, follower: 5 },
  { x: 258, feet: 147, follower: 6 },
  { x: 265, feet: 141, follower: 7 },
  { x: 272, feet: 147, follower: 8 },
  { x: 279, feet: 141, follower: 2 },
  { x: 286, feet: 147, follower: 5 },
  { x: 293, feet: 141, follower: 0 }
];

/**
 * Where the follower who brings a miracle request prays: right of the Bênção button under the altar and
 * left of the protagonist, so they cover neither. They face the altar.
 */
export const ALTAR_STAND: YardPoint = { x: 171, feet: 146 };

/** Everyone in the yard faces this line through the altar: the Esfera's x when it sits on the altar. */
export const ALTAR_X = 122;

/** Walking pace in background pixels per second. */
export const FOLLOWER_WALK_SPEED = 36;
