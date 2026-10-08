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
 * Fill order: the first converts gather between the altar and the door, later ones spread
 * along the hill top. Wide screens crop the art to about y 38–153, so every spot stays above that.
 */
export const FOLLOWER_SPOTS: readonly FollowerSpot[] = [
  { x: 178, feet: 146, follower: 0 },
  { x: 70, feet: 150, follower: 1 },
  { x: 212, feet: 145, follower: 2 },
  { x: 254, feet: 148, follower: 3 },
  { x: 194, feet: 151, follower: 4 },
  { x: 288, feet: 149, follower: 5 },
  { x: 52, feet: 151, follower: 6 },
  { x: 234, feet: 151, follower: 7 },
  { x: 318, feet: 150, follower: 8 },
  { x: 168, feet: 151, follower: 2 },
  { x: 270, feet: 151, follower: 5 },
  { x: 302, feet: 147, follower: 0 }
];

/** Where a praying follower stands on each side of the altar; they always face it. */
export const ALTAR_STANDS: { left: YardPoint; right: YardPoint } = {
  left: { x: 92, feet: 150 },
  right: { x: 150, feet: 149 }
};

/** Walking pace in background pixels per second. */
export const FOLLOWER_WALK_SPEED = 36;
