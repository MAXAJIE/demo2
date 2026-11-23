/**
 * Crop maths for the canvas editor, kept free of DOM types so it stays testable
 * in a plain Node test run.
 *
 * The viewport canvas shows exactly one crop rect, so the same numbers drive
 * both the on-screen frame and the blob that is uploaded.
 */

export type CropCenter = { x: number; y: number };

export type CropRect = { sx: number; sy: number; sw: number; sh: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

export function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

/** The largest rect with the target aspect that fits inside the image. */
export function baseCropSize(
  imageWidth: number,
  imageHeight: number,
  aspect: number,
): { width: number; height: number } {
  if (imageWidth <= 0 || imageHeight <= 0 || aspect <= 0) {
    return { width: 0, height: 0 };
  }
  const imageAspect = imageWidth / imageHeight;
  if (imageAspect >= aspect) {
    return { width: imageHeight * aspect, height: imageHeight };
  }
  return { width: imageWidth, height: imageWidth / aspect };
}

export function cropSizeAtZoom(
  imageWidth: number,
  imageHeight: number,
  aspect: number,
  zoom: number,
): { width: number; height: number } {
  const base = baseCropSize(imageWidth, imageHeight, aspect);
  const safeZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  return {
    width: Math.max(1, base.width / safeZoom),
    height: Math.max(1, base.height / safeZoom),
  };
}

/** Keeps the crop window inside the image, even after zooming out. */
export function clampCropCenter(
  imageWidth: number,
  imageHeight: number,
  aspect: number,
  zoom: number,
  center: CropCenter,
): CropCenter {
  const size = cropSizeAtZoom(imageWidth, imageHeight, aspect, zoom);
  return {
    x: clamp(center.x, size.width / 2, Math.max(size.width / 2, imageWidth - size.width / 2)),
    y: clamp(center.y, size.height / 2, Math.max(size.height / 2, imageHeight - size.height / 2)),
  };
}

export function cropRect(
  imageWidth: number,
  imageHeight: number,
  aspect: number,
  zoom: number,
  center: CropCenter,
): CropRect {
  const size = cropSizeAtZoom(imageWidth, imageHeight, aspect, zoom);
  const clamped = clampCropCenter(imageWidth, imageHeight, aspect, zoom, center);
  return {
    sx: clamped.x - size.width / 2,
    sy: clamped.y - size.height / 2,
    sw: size.width,
    sh: size.height,
  };
}

/** Drag delta is in image pixels: dragging right moves the photo right. */
export function panCropCenter(
  imageWidth: number,
  imageHeight: number,
  aspect: number,
  zoom: number,
  center: CropCenter,
  deltaX: number,
  deltaY: number,
): CropCenter {
  return clampCropCenter(imageWidth, imageHeight, aspect, zoom, {
    x: center.x + deltaX,
    y: center.y + deltaY,
  });
}
