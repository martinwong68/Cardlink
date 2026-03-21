import type { LucideIcon } from "lucide-react";

/**
 * ModuleFunctionDefinition — shared config type for module function tiles.
 *
 * Each business module (Accounting, Inventory, CRM, etc.) defines an array
 * of these to power the slider + detail-card pattern on its landing page.
 *
 * Usage example (in a module page):
 *
 *   import { FileText, BookOpen } from "lucide-react";
 *   import type { ModuleFunctionDefinition } from "@/src/lib/module-functions";
 *
 *   const functions: ModuleFunctionDefinition[] = [
 *     {
 *       id: "invoices",
 *       title: "Invoices",
 *       description: "Create and manage invoices",
 *       icon: FileText,
 *       ctaLabel: "Create Invoice",
 *       ctaHref: "/business/accounting/invoices",
 *     },
 *     ...
 *   ];
 *
 * Then pass `functions` to <ModuleFunctionSlider /> and handle selection
 * to display <ModuleFunctionDetailCard />.
 */
export type ModuleFunctionDefinition = {
  /** Unique key used for selection state */
  id: string;
  /** Display title on the tile */
  title: string;
  /** Longer description shown in detail card */
  description: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Background color class for icon circle (e.g. "bg-blue-50 text-blue-600") */
  color: string;
  /** Label for the CTA button in the detail card */
  ctaLabel: string;
  /** Route the CTA navigates to */
  ctaHref: string;
  /** Optional badge text shown on the tile (e.g. "3 pending") */
  badgeText?: string;
};
