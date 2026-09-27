/** Background color, carried over from the original 4DVJ (#112130). */
export const CLEAR_COLOR = 0x112130;

/** Upper bound for devicePixelRatio so 4K/Retina screens do not quadruple the fill cost. */
export const MAX_PIXEL_RATIO = 2;

/** Longest frame delta (seconds) passed to updaters. Prevents jumps after a tab was in the background. */
export const MAX_FRAME_DELTA = 0.1;

/** Default camera settings. */
export const CAMERA_FOV = 40;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 100;
export const CAMERA_DISTANCE = 3;
