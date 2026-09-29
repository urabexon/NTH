export function easeToward(
  current: number,
  target: number,
  dt: number,
  timeConstant: number,
): number {
  if (timeConstant <= 0) return target;
  return current + (target - current) * (1 - Math.exp(-dt / timeConstant));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}
