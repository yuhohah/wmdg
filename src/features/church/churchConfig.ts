/**
 * Church-yard tuning, kept apart from scene code. Positions are in background
 * pixels (the tier art is 400×192); `feet` is the ground line under the sprite.
 */
export interface FollowerSpot {
  x: number;
  feet: number;
  /** Which of the 9 follower identities stands here. */
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
export const ALTAR_STANDS = {
  left: { x: 92, feet: 150 },
  right: { x: 150, feet: 149 }
} as const;

/** Walking pace in background pixels per second. */
export const FOLLOWER_WALK_SPEED = 36;
