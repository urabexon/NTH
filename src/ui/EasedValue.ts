import { SLIDER_EASING_TIME } from '@/core/config';
import { clamp, easeToward } from '@/core/easing';

export class EasedValue {
  private current: number;
  private goal: number;

  constructor(
    initial: number,
    readonly min: number,
    readonly max: number,
    private readonly timeConstant: number = SLIDER_EASING_TIME,
  ) {
    this.current = clamp(initial, min, max);
    this.goal = this.current;
  }

  get value(): number {
    return this.current;
  }

  get target(): number {
    return this.goal;
  }

  set target(value: number) {
    this.goal = clamp(value, this.min, this.max);
  }

  jumpTo(value: number): void {
    this.goal = clamp(value, this.min, this.max);
    this.current = this.goal;
  }

  update(dt: number): boolean {
    if (this.current === this.goal) return false;
    this.current = easeToward(this.current, this.goal, dt, this.timeConstant);
    if (Math.abs(this.current - this.goal) < 1e-6) this.current = this.goal;
    return true;
  }
}
