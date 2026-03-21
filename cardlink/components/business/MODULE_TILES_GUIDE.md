# Module Function Tile System — Reuse Guide

This pattern provides a **slider → detail card → CTA** UI for business module landing pages.

## Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ModuleFunctionTile` | `components/business/ModuleFunctionTile.tsx` | Single tile matching Business tab visual language |
| `ModuleFunctionSlider` | `components/business/ModuleFunctionSlider.tsx` | Scroll-snap slider (2 cols mobile / 4 cols desktop) |
| `ModuleFunctionDetailCard` | `components/business/ModuleFunctionDetailCard.tsx` | Detail card with content slot + CTA |
| `ModuleFunctionDefinition` | `src/lib/module-functions.ts` | Config type for defining functions |

## How to add function tiles to a new module

### 1. Define your functions array

```tsx
// e.g. in app/business/inventory/page.tsx
import { Package, Truck, BarChart3, ClipboardList } from "lucide-react";
import type { ModuleFunctionDefinition } from "@/src/lib/module-functions";

const inventoryFunctions: ModuleFunctionDefinition[] = [
  {
    id: "products",
    title: "Products",
    description: "Manage your product catalogue",
    icon: Package,
    color: "bg-orange-50 text-orange-600",
    ctaLabel: "Add Product",
    ctaHref: "/business/inventory/products/new",
  },
  {
    id: "purchase-orders",
    title: "Purchase Orders",
    description: "Create and track purchase orders",
    icon: Truck,
    color: "bg-blue-50 text-blue-600",
    ctaLabel: "New PO",
    ctaHref: "/business/inventory/purchase-orders/new",
  },
  // ...more functions
];
```

### 2. Wire up the slider + detail card in your page

```tsx
"use client";

import { useState, useMemo } from "react";
import ModuleFunctionSlider from "@/components/business/ModuleFunctionSlider";
import ModuleFunctionDetailCard from "@/components/business/ModuleFunctionDetailCard";

export default function InventoryLandingPage() {
  const [activeId, setActiveId] = useState(inventoryFunctions[0].id);

  const activeFunc = useMemo(
    () => inventoryFunctions.find((f) => f.id === activeId) ?? inventoryFunctions[0],
    [activeId],
  );

  return (
    <div className="space-y-4 pb-28">
      <ModuleFunctionSlider
        items={inventoryFunctions}
        activeId={activeId}
        onSelect={setActiveId}
      />
      <ModuleFunctionDetailCard
        title={activeFunc.title}
        description={activeFunc.description}
        ctaLabel={activeFunc.ctaLabel}
        ctaHref={activeFunc.ctaHref}
      >
        {/* Your summary content here — or omit for empty state */}
      </ModuleFunctionDetailCard>
    </div>
  );
}
```

### 3. Detail card content patterns

- **Data summary**: Render a list of recent items from your API inside `<ModuleFunctionDetailCard>` children
- **Empty state**: Pass `empty={true}` and `emptyMessage="..."` — the card renders an Inbox icon + message
- **Loading state**: Pass `loading={true}` — the card renders a spinner
- **CTA**: Can be `ctaHref` (Link) or `onCtaClick` (callback)

### 4. Tile dimension consistency

All tiles use the `.module-tile` CSS class (defined in `globals.css`) which enforces `min-height: 120px`. The `app-card` base provides consistent border-radius (12px), shadow, and border.

## Layout requirements

- Use `pb-28` on your page container (the floating bottom nav needs clearance)
- The `ModuleFunctionSlider` handles responsive paging automatically (2 mobile / 4 desktop)
- If your module has a Shell/Layout wrapper, conditionally hide its header on the landing page (see `AccountingShell.tsx` for the pattern)
