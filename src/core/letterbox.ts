export interface Size {
  readonly width: number;
  readonly height: number;
}

export function fitAspect(container: Size, aspect: number): Size {
  const containerAspect = container.width / container.height;
  if (containerAspect > aspect) {
    return { width: Math.round(container.height * aspect), height: container.height };
  }
  return { width: container.width, height: Math.round(container.width / aspect) };
}
