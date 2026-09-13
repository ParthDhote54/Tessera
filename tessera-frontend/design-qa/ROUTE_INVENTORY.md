# Tessera Route Inventory

This inventory documents all routes discovered across the Tessera frontend application for visual QA audit and iterative redesign.

---

## Discovered Routes

| Route Pattern | Component | Access Type | Primary Experience / Purpose |
|---|---|---|---|
| `/` | `LandingPage` | Public | **Marketing & Product Stage Hero**: Introduces Tessera spatial field, live stage visualizer, core principles, beat tabs, and instant room creation CTA. |
| `/room/:roomId` | `RoomPage` | Guest Link | **Live Composition Field**: Spatial canvas engine with interactive elements, real-time soft locking, presence cursors, and floating collaboration dock. |
| `*` (Catch-all) | `NotFound` | Public | **Fallback 404 Page**: Minimalist dark card displaying route error state and return to canvas action button. |

---

## Required Visual Viewports

All 3 routes are inspected and scored independently across 6 standard viewports:
1. **1440 × 900** (Desktop Standard / Ultra-wide)
2. **1280 × 800** (Laptop Medium)
3. **1024 × 768** (Tablet Landscape)
4. **768 × 1024** (Tablet Portrait)
5. **390 × 844** (Mobile Portrait — iPhone 14)
6. **375 × 812** (Mobile Compact — iPhone X/13 Mini)
