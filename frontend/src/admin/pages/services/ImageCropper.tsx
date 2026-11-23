import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";
import { ImagePlus, Loader2, Minus, Plus, RotateCcw, Upload } from "lucide-react";

import type { Locale } from "../../../types";
import { servicesCopy } from "./copy";
import {
  clamp,
  clampCropCenter,
  cropRect,
  cropSizeAtZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  panCropCenter,
  type CropCenter,
} from "./crop";
import { SERVICE_IMAGE_SPECS, type ImageKind } from "./state";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

type LoadedImage = {
  element: HTMLImageElement;
  width: number;
  height: number;
  objectUrl: string;
};

type ViewportSize = { width: number; height: number };

export type ImageCropperProps = {
  kind: ImageKind;
  locale: Locale;
  /** The saved URL for this slot, or undefined when the slot is empty. */
  imageUrl?: string;
  uploading: boolean;
  /** Upload failure message owned by the wizard. */
  error: string;
  onCrop: (kind: ImageKind, file: File) => void;
  /** Live data URL of the exact crop, so the card frame updates while dragging. */
  onPreview: (kind: ImageKind, dataUrl: string | null) => void;
};

/**
 * Dependency-free canvas cropper.
 *
 * The fixed-ratio viewport canvas *is* the crop: it draws exactly the source
 * rect that `buildCroppedFile` uploads, so what the merchant frames is what the
 * card and detail page receive. Zoom is 100-300% and drag pans the photo.
 */
export function ImageCropper({
  kind,
  locale,
  imageUrl,
  uploading,
  error,
  onCrop,
  onPreview,
}: ImageCropperProps) {
  const spec = SERVICE_IMAGE_SPECS[kind];
  const label = kind === "cover" ? servicesCopy.coverLabel[locale] : servicesCopy.detailLabel[locale];
  const hint = kind === "cover" ? servicesCopy.coverHint[locale] : servicesCopy.detailHint[locale];

  const [source, setSource] = useState<LoadedImage | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [center, setCenter] = useState<CropCenter>({ x: 0, y: 0 });
  const [viewport, setViewport] = useState<ViewportSize>({ width: 0, height: 0 });
  const [localError, setLocalError] = useState("");

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    center: CropCenter;
  } | null>(null);
  const startedWithUrlRef = useRef<string | undefined>(imageUrl);

  // Revoke the previous object URL whenever the source is replaced or unmounted.
  useEffect(() => {
    return () => {
      if (source) URL.revokeObjectURL(source.objectUrl);
    };
  }, [source]);

  // A successful upload changes the saved URL: drop the local crop so the
  // cropper shows the uploaded image instead of a stale local preview.
  useEffect(() => {
    if (!source) return;
    if (imageUrl && imageUrl !== startedWithUrlRef.current) {
      setSource(null);
      onPreview(kind, null);
    }
  }, [imageUrl, kind, onPreview, source]);

  // Never leave a stale crop preview behind when the step is left.
  useEffect(() => {
    return () => onPreview(kind, null);
  }, [kind, onPreview]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const measure = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      setViewport((current) =>
        current.width === width && current.height === height ? current : { width, height },
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!source || !canvas || viewport.width < 1 || viewport.height < 1) return;
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const pixelWidth = Math.max(1, Math.round(viewport.width * dpr));
    const pixelHeight = Math.max(1, Math.round(viewport.height * dpr));
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

    const rect = cropRect(source.width, source.height, spec.aspect, zoom, center);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingQuality = "high";
    context.clearRect(0, 0, pixelWidth, pixelHeight);
    context.drawImage(
      source.element,
      rect.sx,
      rect.sy,
      rect.sw,
      rect.sh,
      0,
      0,
      pixelWidth,
      pixelHeight,
    );

    // A small offscreen render feeds the service-card preview that sits next to
    // the cropper, so the card updates live without touching the DOM image.
    const previewWidth = kind === "cover" ? 160 : 240;
    const previewHeight = Math.max(1, Math.round(previewWidth / spec.aspect));
    const previewCanvas = document.createElement("canvas");
    previewCanvas.width = previewWidth;
    previewCanvas.height = previewHeight;
    const previewContext = previewCanvas.getContext("2d");
    if (previewContext) {
      previewContext.imageSmoothingQuality = "high";
      previewContext.drawImage(
        source.element,
        rect.sx,
        rect.sy,
        rect.sw,
        rect.sh,
        0,
        0,
        previewWidth,
        previewHeight,
      );
      onPreview(kind, previewCanvas.toDataURL("image/jpeg", 0.7));
    }
  }, [center, kind, onPreview, source, spec.aspect, viewport.height, viewport.width, zoom]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Let the same file be picked again after a failed upload.
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLocalError(servicesCopy.fileNotImage[locale]);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setLocalError(servicesCopy.fileTooLarge[locale]);
      return;
    }
    setLocalError("");
    const objectUrl = URL.createObjectURL(file);
    const element = new Image();
    element.onload = () => {
      startedWithUrlRef.current = imageUrl;
      setSource({ element, width: element.naturalWidth, height: element.naturalHeight, objectUrl });
      setZoom(MIN_ZOOM);
      setCenter({ x: element.naturalWidth / 2, y: element.naturalHeight / 2 });
    };
    element.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setLocalError(servicesCopy.fileNotImage[locale]);
    };
    element.src = objectUrl;
  };

  const applyZoom = (next: number) => {
    if (!source) return;
    const nextZoom = clamp(next, MIN_ZOOM, MAX_ZOOM);
    setZoom(nextZoom);
    setCenter((current) =>
      clampCropCenter(source.width, source.height, spec.aspect, nextZoom, current),
    );
  };

  const resetFraming = () => {
    if (!source) return;
    setZoom(MIN_ZOOM);
    setCenter({ x: source.width / 2, y: source.height / 2 });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!source || uploading) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, center };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!source || !drag || drag.pointerId !== event.pointerId) return;
    // The viewport shows exactly the crop, so CSS pixels map to image pixels
    // through the crop size / viewport size ratio.
    const cropSize = cropSizeAtZoom(source.width, source.height, spec.aspect, zoom);
    const factorX = cropSize.width / Math.max(1, viewport.width);
    const factorY = cropSize.height / Math.max(1, viewport.height);
    const deltaX = (event.clientX - drag.x) * factorX;
    const deltaY = (event.clientY - drag.y) * factorY;
    // Dragging the photo right moves the visible crop window left.
    setCenter(panCropCenter(source.width, source.height, spec.aspect, zoom, drag.center, -deltaX, -deltaY));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const buildCroppedFile = async (): Promise<File | null> => {
    if (!source) return null;
    const rect = cropRect(source.width, source.height, spec.aspect, zoom, center);
    const output = document.createElement("canvas");
    output.width = spec.width;
    output.height = spec.height;
    const context = output.getContext("2d");
    if (!context) return null;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      source.element,
      rect.sx,
      rect.sy,
      rect.sw,
      rect.sh,
      0,
      0,
      spec.width,
      spec.height,
    );
    const blob = await new Promise<Blob | null>((resolve) => {
      output.toBlob((value) => resolve(value), "image/jpeg", 0.9);
    });
    if (!blob) return null;
    return new File([blob], `${kind}-${Date.now()}.jpg`, { type: "image/jpeg" });
  };

  const handleUseCrop = () => {
    void (async () => {
      const file = await buildCroppedFile();
      if (!file) {
        setLocalError(servicesCopy.uploadFailed[locale]);
        return;
      }
      setLocalError("");
      onCrop(kind, file);
    })();
  };

  const message = error || localError;

  return (
    <section className="card flex flex-col p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{label}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p>
        </div>
        <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
          {spec.ratioLabel}
        </span>
      </div>

      <div
        ref={viewportRef}
        className="relative mt-4 w-full overflow-hidden rounded-control border border-line bg-surface2"
        style={{ aspectRatio: spec.cssAspect }}
      >
        {source ? (
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            role="img"
            aria-label={`${label} · ${servicesCopy.dragHint[locale]}`}
            className="absolute inset-0 h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
          />
        ) : imageUrl ? (
          <img src={imageUrl} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted">
            <ImagePlus size={22} aria-hidden="true" />
            {servicesCopy.noImageYet[locale]}
          </div>
        )}
      </div>

      {source ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => applyZoom(zoom - 0.25)}
              disabled={zoom <= MIN_ZOOM}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line disabled:opacity-40"
              aria-label={servicesCopy.zoomOut[locale]}
            >
              <Minus size={14} aria-hidden="true" />
            </button>
            <input
              type="range"
              min={MIN_ZOOM * 100}
              max={MAX_ZOOM * 100}
              step={5}
              value={Math.round(zoom * 100)}
              onChange={(event) => applyZoom(Number(event.target.value) / 100)}
              aria-label={servicesCopy.zoomLabel[locale]}
              className="h-1.5 flex-1 cursor-pointer"
              style={{ accentColor: "var(--accent)" }}
            />
            <button
              type="button"
              onClick={() => applyZoom(zoom + 0.25)}
              disabled={zoom >= MAX_ZOOM}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line disabled:opacity-40"
              aria-label={servicesCopy.zoomIn[locale]}
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </div>
          <p className="text-xs text-muted">{servicesCopy.dragHint[locale]}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleUseCrop}
              disabled={uploading}
              className="btn btn-primary !min-h-[2.5rem] !px-3.5 !text-xs"
            >
              {uploading ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Upload size={14} aria-hidden="true" />
              )}
              {uploading ? servicesCopy.uploading[locale] : servicesCopy.useCrop[locale]}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn btn-outline !min-h-[2.5rem] !px-3.5 !text-xs"
            >
              {servicesCopy.replaceImage[locale]}
            </button>
            <button
              type="button"
              onClick={resetFraming}
              disabled={uploading}
              className="btn btn-outline !min-h-[2.5rem] !px-3.5 !text-xs"
            >
              <RotateCcw size={13} aria-hidden="true" />
              {servicesCopy.resetFraming[locale]}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn btn-outline mt-3 w-full !min-h-[2.5rem] !text-xs"
        >
          {uploading ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus size={14} aria-hidden="true" />
          )}
          {uploading
            ? servicesCopy.uploading[locale]
            : imageUrl
              ? servicesCopy.replaceImage[locale]
              : servicesCopy.chooseImage[locale]}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFile}
        aria-label={servicesCopy.chooseImage[locale]}
      />

      {message ? (
        <p role="alert" className="error-text">
          {message}
        </p>
      ) : null}
    </section>
  );
}
