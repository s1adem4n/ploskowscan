import Panzoom, { type PanzoomObject } from '@panzoom/panzoom';

export interface PanzoomController {
  zoomIn(): void;
  zoomOut(): void;
  reset(): void;
  destroy(): void;
}

export function createPanzoom(
  viewport: HTMLElement,
  content: HTMLElement,
  onTap: (event: PointerEvent) => void,
  onScaleChange?: (scale: number) => void,
): PanzoomController {
  const pointers = new Map<number, { x: number; y: number }>();
  let moved = false;
  const instance: PanzoomObject = Panzoom(content, {
    canvas: true,
    minScale: 0.25,
    maxScale: 8,
    step: 0.35,
    panOnlyWhenZoomed: true,
    cursor: 'grab',
  });

  const pointerDown = (event: PointerEvent) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size > 1) moved = true;
  };
  const pointerMove = (event: PointerEvent) => {
    const start = pointers.get(event.pointerId);
    if (
      start &&
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7
    )
      moved = true;
  };
  const pointerUp = (event: PointerEvent) => {
    const isTap = pointers.size === 1 && !moved;
    pointers.delete(event.pointerId);
    if (isTap) onTap(event);
    if (pointers.size === 0) moved = false;
  };
  const pointerCancel = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    if (pointers.size === 0) moved = false;
  };
  const wheel = (event: WheelEvent) => instance.zoomWithWheel(event);
  const scaleChange = (event: Event) => {
    const { scale } = (event as CustomEvent<{ scale: number }>).detail;
    onScaleChange?.(scale);
  };

  viewport.addEventListener('pointerdown', pointerDown, true);
  viewport.addEventListener('pointermove', pointerMove, true);
  viewport.addEventListener('pointerup', pointerUp, true);
  viewport.addEventListener('pointercancel', pointerCancel, true);
  viewport.addEventListener('wheel', wheel, { passive: false });
  content.addEventListener('panzoomchange', scaleChange);
  onScaleChange?.(instance.getScale());

  return {
    zoomIn: () => instance.zoomIn({ animate: false }),
    zoomOut: () => instance.zoomOut({ animate: false }),
    reset: () => instance.reset({ animate: false }),
    destroy: () => {
      viewport.removeEventListener('pointerdown', pointerDown, true);
      viewport.removeEventListener('pointermove', pointerMove, true);
      viewport.removeEventListener('pointerup', pointerUp, true);
      viewport.removeEventListener('pointercancel', pointerCancel, true);
      viewport.removeEventListener('wheel', wheel);
      content.removeEventListener('panzoomchange', scaleChange);
      instance.destroy();
    },
  };
}
