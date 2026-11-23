# Pillar 2: UI, Motion & Design Craft Manual

Elevate webpages from generic AI output to cohesive, responsive, tactile product experiences.

## 1. Eradicating "AI Template Slop"

Audit the visual hierarchy and layout rhythm against common AI-generated anti-patterns:

- **Unmotivated Gradients & Glow Bloat**: Remove gratuitous rainbow/purple neon gradients, heavy multi-layered drop shadows on every container, and decorative glassmorphism blur where solid surfaces with crisp `1px` borders read cleaner and render faster.
- **Typographic Hierarchy & Readability**:
  - Verify clear contrast in scale and weight across Display, `H1`, `H2`, `H3`, body, and metadata text.
  - Apply `text-wrap: balance` (or Tailwind `text-balance`) on multi-line headings to prevent awkward single-word orphans.
  - Constrain long-form body copy to `60ch-75ch` (`max-w-prose`) with comfortable line height (`1.5-1.7`).
- **Spatial Rhythm (4pt/8pt Grid)**: Audit padding and gap consistency across sibling cards, section verticals, and modal interiors. Every container's inner padding must be visually proportional to its border radius and content density.
- **Respect Brand Tokens (Tier 2 Guardrail)**: Do not alter established brand colors, fonts, or copy directly; if palette contrast or token consistency is broken, propose the token adjustment in the Tier 2 approval queue.

## 2. 60fps GPU-Only Motion & Touch Safety

- **Compositor-Only Properties**: Animate exclusively `transform` (`translate`, `scale`, `rotate`) and `opacity`. Flag and replace animations on `width`, `height`, `top`, `left`, `margin`, `padding`, or `box-shadow` that trigger expensive layout or paint recalculations.
- **Touch-Safe Hover Rules**: Never assume a mouse pointer. Guard hover-triggered reveals or lift effects with `@media (hover: hover) and (pointer: fine)` (or explicit `active:` feedback on touch devices) so mobile taps do not leave stuck hover states or cause horizontal viewport overflow.
- **Zero Cumulative Layout Shift (`CLS = 0`)**:
  - Above-the-fold hero elements must never start at `opacity: 0; transform: translateY(...)` in a way that shifts sibling layout or delays Largest Contentful Paint if JS hydrates late.
  - Always reserve explicit dimensions (`aspect-video`, `aspect-square`, or explicit `width` and `height`) on media, embeds, and dynamic banners.

## 3. Mandatory UI State Completeness

Every async data view, form, or interactive widget must handle all four lifecycle states:

1. **Loading State**: Render layout-matched **Skeleton placeholders** (`animate-pulse` with exact target dimensions) rather than blank screens or unstyled spinners.
2. **Empty State**: When a list, search result, or dashboard widget has zero items, render an intentional empty state explaining why it is empty and providing a clear primary CTA.
3. **Error State**: Wrap async boundaries and mutations with graceful error UI containing a human-readable explanation and a one-click **Retry** action.
4. **Micro-Interaction Feedback**: Interactive buttons, links, and inputs must define distinct `:hover`, `:focus-visible`, `:active` (subtle tactile press such as `active:scale-[0.98]`), and `disabled` (`cursor-not-allowed opacity-50`) states.

## 4. Media & WCAG AA+ Accessibility

- **Image Optimization**:
  - Hero/LCP images must use `priority` / `fetchpriority="high"` and eager loading.
  - Below-the-fold images must use `loading="lazy"`.
  - Use `object-cover` or `object-contain` with locked aspect ratios so images never stretch or squash.
  - Provide descriptive `alt` text for meaningful images and `alt=""` for purely decorative graphics.
- **Keyboard, Contrast & Motion Accessibility**:
  - Every focusable element must display a high-contrast `:focus-visible` ring; never use `outline-none` without a custom focus indicator.
  - Maintain >= `4.5:1` contrast for normal text and >= `3:1` for large text and active UI controls.
  - Icon-only buttons must include an accessible `aria-label` or screen-reader text.
  - Include `@media (prefers-reduced-motion: reduce)` (or Framer Motion `useReducedMotion`) to disable parallax, auto-playing loops, and large spatial transitions for motion-sensitive users.
