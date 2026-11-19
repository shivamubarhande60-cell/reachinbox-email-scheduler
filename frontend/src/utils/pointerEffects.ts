import type { PointerEvent as ReactPointerEvent } from 'react';

/**
 * Updates CSS custom properties for the interactive spotlight and parallax effect on the login screen.
 */
export function updateLandingPointer(event: ReactPointerEvent<HTMLElement>, reset = false): void {
  if (event.pointerType === 'touch' && !reset) return;

  const page = event.currentTarget;
  const pageBounds = page.getBoundingClientRect();
  const x = reset ? 50 : ((event.clientX - pageBounds.left) / Math.max(pageBounds.width, 1)) * 100;
  const y = reset ? 50 : ((event.clientY - pageBounds.top) / Math.max(pageBounds.height, 1)) * 100;
  page.style.setProperty('--pointer-x', `${x}%`);
  page.style.setProperty('--pointer-y', `${y}%`);

  const preview = page.querySelector<HTMLElement>('.login-preview');
  if (!preview) return;

  const previewBounds = preview.getBoundingClientRect();
  const previewX = reset
    ? 80
    : Math.min(100, Math.max(0, ((event.clientX - previewBounds.left) / Math.max(previewBounds.width, 1)) * 100));
  const previewY = reset
    ? 15
    : Math.min(100, Math.max(0, ((event.clientY - previewBounds.top) / Math.max(previewBounds.height, 1)) * 100));

  preview.style.setProperty('--panel-pointer-x', `${previewX}%`);
  preview.style.setProperty('--panel-pointer-y', `${previewY}%`);

  const shiftX = reset ? 0 : ((x - 50) / 50) * 22;
  const shiftY = reset ? 0 : ((y - 50) / 50) * 22;
  preview.style.setProperty('--panel-shift-x', `${shiftX}px`);
  preview.style.setProperty('--panel-shift-y', `${shiftY}px`);
  preview.style.setProperty('--panel-shift-x-reverse', `${-shiftX}px`);
  preview.style.setProperty('--panel-shift-y-reverse', `${-shiftY}px`);
}
