# Design Brief

## Direction

**Denim & Mostaza** — a warm, tactile workwear-inspired inventory tool for a Spanish-speaking clothing shop, built phone-first for Android.

## Tone

Utilitarian-warm: honest, sturdy, and physical — like a well-made denim apron with visible stitching, not a corporate dashboard.

## Differentiation

The "running stitch" mustard detail (dashed dividers, active-tab dot, FAB ring) turns everyday inventory chores into a garment-like, handcrafted surface.

## Color Palette

| Token      | OKLCH         | Hex (light) | Role                              |
| ---------- | ------------- | ----------- | --------------------------------- |
| background | 0.97 0.008 250 | #F4F6FB     | App canvas, cool off-white        |
| foreground | 0.2 0.02 258   | #1C2436     | Primary text                      |
| card       | 1.0 0.002 250  | #FFFFFF     | Product/expense surfaces          |
| primary    | 0.44 0.13 264  | #33549E     | Denim blue — buttons, active nav  |
| accent     | 0.78 0.15 82   | #E0A83A     | Mustard — highlights, FAB, badges |
| muted      | 0.93 0.012 252 | #E5E9F1     | Inactive fills, secondary text bg |
| destructive| 0.55 0.22 27   | #C43D2E     | Negative profit, delete actions   |
| success    | 0.55 0.15 150  | #2E8B57     | Positive profit                   |
| border     | 0.9 0.014 254  | #D8DEE9     | Dividers, card strokes            |

Dark theme (`.dark`): background `0.17 0.022 262`, card `0.215 0.026 262`, primary `0.7 0.12 264`, accent `0.8 0.15 84`.

## Typography

- Display: **Space Grotesk** — headings, tab labels, and large money figures (S/ amounts).
- Body: **DM Sans** — labels, form fields, list copy, helper text.
- Mono: **JetBrains Mono** — SKU codes and stock counts.
- Scale: hero `text-3xl font-bold tracking-tight`, h2 `text-xl font-semibold`, label `text-xs font-semibold tracking-wide uppercase`, body `text-base`, money `text-2xl font-bold tabular-nums font-display`.

## Elevation & Depth

Flat canvas with layered surfaces: cards float on `shadow-card`, sheets and modals use `shadow-elevated`, the bottom tab bar uses `shadow-tabbar`; no glow effects.

## Structural Zones

| Zone        | Background            | Border                   | Notes                                          |
| ----------- | --------------------- | ------------------------ | ---------------------------------------------- |
| Header      | `bg-card`             | `border-b`               | Store name + compact month summary card        |
| Summary     | `bg-gradient-primary` | none                     | Ventas / Gastos / Ganancia in white + mustard  |
| Content     | `bg-background`       | —                        | Alternating `bg-muted/40` section bands        |
| Tab bar     | `bg-card`             | `border-t` + `shadow-tabbar` | 4 tabs, active = denim + mustard dot       |

## Spacing & Rhythm

Mobile-first `px-4` gutters, `gap-3` inside cards, `space-y-5` between sections, `py-3` list rows; controls are 48–56px tall for thumb reach.

## Component Patterns

- Buttons: `h-14 rounded-xl` full-width primary (denim gradient), `h-12` secondary (mustard outline), pressed scale 0.98; 3px `ring` focus-visible.
- Cards: `rounded-2xl bg-card border shadow-card p-4`, product rows with size chips and stock badge.
- Tables: card-per-row on phones (`rounded-xl border`), hairline `divide-y` rows, right-aligned `tabular-nums` money.
- Bottom tabs: `h-16`, icon 24px + `text-xs` label, active denim with mustard 4px dot; `pb-safe`.
- Badges: pill `rounded-full text-xs font-semibold`; stock low = mustard, out = destructive.

## Motion

- Entrance: list/cards `animate-fade-up` 280ms staggered; sheets `animate-sheet-up` 300ms.
- Hover/press: `transition-smooth` 300ms; buttons `active:scale-[0.98]`.
- Decorative: mustard stitch divider is static; FAB uses `animate-pop-in` on mount only.

## Constraints

- All copy in Spanish; amounts formatted as `S/ 1,234.50` with `tabular-nums`.
- Mobile-first; every interactive target ≥ 48px; visible `:focus-visible` ring everywhere.
- Automatic dark mode via system `prefers-color-scheme` → `.dark` class; no manual toggle required.
- Token-only styling — no raw hex, `rgb()`, or arbitrary color classes in components.
- No reports/trend charts, no customer or credit-sale management (out of scope).

## Signature Detail

Category: **texture/material** — the mustard running-stitch line (`.stitch-line`) and denim-weave tint (`.texture-denim`) echo garment construction throughout the UI.
