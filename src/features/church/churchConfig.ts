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
 * Fill order: the first converts gather in front of the door, later ones fill out two rows along the hill top.
 * Only stage x 88–312 (22–78%) is visible on every viewport, and wide screens crop the art to about y 30–146,
 * so every spot stays inside that box and right of x 205, leaving the gap beside the altar free.
 */
export const FOLLOWER_SPOTS: readonly FollowerSpot[] = [
  { x: 209, feet: 147, follower: 0 },
  { x: 217, feet: 141, follower: 1 },
  { x: 226, feet: 147, follower: 2 },
  { x: 234, feet: 141, follower: 3 },
  { x: 243, feet: 147, follower: 4 },
  { x: 251, feet: 141, follower: 5 },
  { x: 260, feet: 147, follower: 6 },
  { x: 268, feet: 141, follower: 7 },
  { x: 277, feet: 147, follower: 8 },
  { x: 285, feet: 141, follower: 2 },
  { x: 294, feet: 147, follower: 5 },
  { x: 302, feet: 141, follower: 0 }
];

/** Where a praying follower stands on each side of the altar; they always face it. */
export const ALTAR_STANDS: { left: YardPoint; right: YardPoint } = {
  left: { x: 102, feet: 147 },
  right: { x: 138, feet: 146 }
};

/** Walking pace in background pixels per second. */
export const FOLLOWER_WALK_SPEED = 36;
