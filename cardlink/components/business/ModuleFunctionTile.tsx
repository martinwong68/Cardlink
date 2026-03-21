"use client";

import type { LucideIcon } from "lucide-react";

/**
 * ModuleFunctionTile — a single tile matching the Business tab module tile
 * visual language: app-card, icon circle, title, optional badge.
 *
 * Enforces consistent dimensions across the app via fixed height/aspect.
 */
export default function ModuleFunctionTile({
  title,
  description,
  icon: Icon,
  color,
  badge,
  active,
  onClick,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  /** Tailwind bg + text color classes for icon circle, e.g. "bg-blue-50 text-blue-600" */
  color: string;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`module-tile app-card group flex flex-col items-start gap-2 p-4 transition
        hover:-translate-y-0.5 hover:border-indigo-200 text-left w-full
        ${active ? "border-indigo-400 ring-2 ring-indigo-100 bg-indigo-50/30" : ""}`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-sm font-semibold text-gray-800 leading-tight">{title}</span>
      {description && (
        <span className="text-[11px] text-gray-500 leading-snug line-clamp-2">{description}</span>
      )}
      {badge && (
        <span className="inline-flex self-start rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-medium">
          {badge}
        </span>
      )}
    </button>
  );
}
