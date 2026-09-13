# Tessera Landing Page — Visual Composition Baseline Inspection

## 1. DOM Structure Inspection
- **Site Navigation**: Fixed floating header (`.site-nav`) with glassmorphism pill containers split into Brand, Mid links, and End actions.
- **Hero Section (`.hero`)**:
  - Layer 1 (`.hero-visual`): `<LivingStage />` rendering dynamic canvas elements (5 node cards, bezier connectors, drift animations, radial gradients).
  - Layer 2 (`.hero-copy`): Centered text stack with `h1`, subtitle `p`, primary button `button#create-room-btn`. Overlaid directly over Layer 1 with absolute/relative stacking.
- **The Stage Section (`.band`)**: Left-aligned headline + subcopy, followed by `.product-frame` containing `.product-field` with 5 hardcoded tile cards and floating cursors.
- **Presence Section (`.presence`)**: Tabbed layout (`.presence-split`) with left sidebar rail (`.beat-rail`) and right display panel (`.beat-stage`).
- **Principles Section (`.principles`)**: 3-column grid (`.principle-row`) of cards with custom micro-visuals (`.principle-art`).
- **Close CTA Section (`.close`)**: Centered text CTA section with `.btn-hero.invert`.
- **Footer (`.site-footer`)**: Brand identity + 2-column link/info grid.

## 2. Major Visual Objects Inventory
1. Navigation Bar (Brand mark, menu links, CTA)
2. Hero Headline ("Compose together. In real time.")
3. Hero Subtitle ("Tessera is a shared canvas...")
4. Primary CTA Button ("Open a room")
5. Hero Canvas Product Tiles ("Hero Product", "AR Anchor", "Shop Now", "20% Off Today", "Quick Poll")
6. Canvas Bezier Connections & Cursors ("Mira Chen", "Jules Park")
7. Stage Section Headline & Subtitle
8. Stage Product Frame & Workspace Mockup
9. Presence Tab Rail & Animated Beat Panels
10. Principle Feature Cards (Spatial thinking, Low-latency presence, Share the URL)
11. Closing CTA Block
12. Site Footer

## 3. Semantic Group Mapping
- **GROUP A — HERO**: Navigation Bar, Hero Headline ("Compose together. In real time."), Hero Subtitle, Primary CTA Button.
- **GROUP B — PRIMARY PRODUCT VISUAL**: Interactive Stage Mockup / Live Composition Canvas demonstrating spatial collaboration.
- **GROUP C — SECONDARY PRODUCT VISUALS**: Feature Interactive Beats ("Shared cursors", "Soft locks", "One shared field", "A link is enough").
- **GROUP D — SUPPORTING INFORMATION**: Value Proposition Principles ("Spatial thinking", "Low-latency presence", "Share the URL").
- **GROUP E — DECORATION**: Subtle background radial glows, alignment grid dots, presence pulses.

## 4. Competing Focal Points
- **CRITICAL CONFLICT**: In the Hero, the large display H1 ("Compose together. In real time.") sits directly on top of 5 glowing, full-color canvas product cards ("Hero Product", "AR Anchor", "Shop Now", "20% Off Today", "Quick Poll") and animated participant cursors ("Mira Chen", "Jules Park").
- The eye cannot parse whether to read the text or look at the cards. Text lines pass through card borders, rendering both illegible.
- The Primary CTA button ("Open a room") lands directly on top of the "Quick Poll" card and "20% Off Today" card.

## 5. Arbitrary & Unanchored Positioning
- In `LivingStage.tsx`, nodes are positioned at arbitrary canvas percentage offsets (`x: 0.18, y: 0.28`, `x: 0.52, y: 0.18`, `x: 0.58, y: 0.38`, `x: 0.14, y: 0.68`, `x: 0.52, y: 0.62`).
- In `.product-field`, CSS classes use arbitrary percentage bounds (`left: 6%; top: 12%`, `left: 48%; top: 10%`, `left: 54%; top: 32%`, `left: 8%; top: 64%`, `left: 48%; top: 58%`).
- Cursors float with arbitrary keyframe offsets (`translate(18px, -14px)`).

## 6. Alignment Axes
- Navigation: Centered floating pill.
- Hero Copy: Center-aligned stack.
- Hero Canvas: Full-bleed unaligned canvas.
- Stage Section: Left-aligned text stack, centered full-width frame.
- Principles: 3-column equal grid.
- Close: Center-aligned stack.
- Disconnected alignment between hero text block width (920px) and section grid max-width (1180px).

## 7. Identified Weaknesses & Structural Violations
- **Hierarchy Failure**: Level 5 & 6 elements (secondary canvas cards, badges, cursors) severely overpower and visually collide with Level 1–4 elements (Headline, Subcopy, Primary CTA).
- **Redundancy**: The exact same 5 product tiles are rendered twice (once in canvas, once in stage frame).
- **Unstructured Spatial Layout**: Absence of a unified 12-column page layout grid.
- **Mobile Breakdown**: On mobile viewports (390px, 375px), canvas nodes and headline overlap completely, making text unreadable.

## Baseline Score: 62/100 (Cap: MAX 78 due to major overlapping content)
- Composition: 10/20
- Visual Hierarchy: 8/20
- Spacing/Alignment: 10/15
- Typography: 12/10 -> 8/10
- Product Presentation: 8/10
- Color/Contrast: 7/10
- Responsive Composition: 5/8
- Interaction/Motion: 3/4
- Visual Consistency: 3/3
