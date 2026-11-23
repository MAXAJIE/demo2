/**
 * Chinese is offered, but its font files are ~105 KB per weight and only ~1% of
 * visitors need them. Fontsource's `400.css` slices the font into 101
 * `unicode-range` blocks, so loading it on demand costs only the slices the
 * visible text actually uses. Never import these statically: an unranged CJK
 * face makes every English or Malay page download megabytes.
 */
let pending: Promise<unknown> | null = null;

export function ensureCjkFonts(): void {
  pending ??= Promise.all([
    import("@fontsource/noto-sans-sc/400.css"),
    import("@fontsource/noto-sans-sc/500.css"),
    import("@fontsource/noto-serif-sc/600.css"),
  ]).catch(() => {
    // A failed font load must not break navigation; the system CJK face is the fallback.
    pending = null;
  });
}
