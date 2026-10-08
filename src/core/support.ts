export interface SupportProbe {
  readonly coarsePointer: boolean;
  readonly canHover: boolean;
  readonly width: number;
  readonly forced: boolean;
}

export const MIN_SUPPORTED_WIDTH = 600;

export function isSupported(probe: SupportProbe): boolean {
  if (probe.forced) return true;
  if (probe.coarsePointer && !probe.canHover) return false;
  return probe.width >= MIN_SUPPORTED_WIDTH;
}

export function probeBrowser(search: string = window.location.search): SupportProbe {
  return {
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    canHover: window.matchMedia('(hover: hover)').matches,
    width: window.innerWidth,
    forced: new URLSearchParams(search).has('force'),
  };
}
