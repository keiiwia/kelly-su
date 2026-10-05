// Single source of truth for motion. Import from here; don't inline durations or easings.
export const duration = {
  fast: 0.15,
  base: 0.3,
  slow: 0.6,
  hero: 1.2,
} as const;

export const ease = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const spring = {
  snappy: { type: "spring", stiffness: 400, damping: 30 },
  soft: { type: "spring", stiffness: 120, damping: 20 },
} as const;
