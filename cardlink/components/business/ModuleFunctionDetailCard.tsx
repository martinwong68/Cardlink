"use client";

import Link from "next/link";
import { Loader2, Inbox } from "lucide-react";

/**
 * ModuleFunctionDetailCard — shows details for the selected function tile.
 *
 * Follows app-card style with:
 * - Title + description header
 * - Flexible content slot for summaries (children)
 * - Full-width CTA button at the bottom
 * - Built-in loading and empty state patterns
 */
export default function ModuleFunctionDetailCard({
  title,
  description,
  ctaLabel,
  ctaHref,
  onCtaClick,
  loading,
  empty,
  emptyMessage,
  children,
}: {
  title: string;
  description?: string;
  ctaLabel: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  children?: React.ReactNode;
}) {
  /* CTA as link or button */
  const ctaClasses = "app-primary-btn w-full py-3 text-sm font-semibold text-center block";

  const ctaElement = ctaHref ? (
    <Link href={ctaHref} className={ctaClasses}>
      {ctaLabel}
    </Link>
  ) : (
    <button type="button" onClick={onCtaClick} className={ctaClasses}>
      {ctaLabel}
    </button>
  );

  return (
    <div className="app-card p-5 space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>

      {/* Content area */}
      <div className="min-h-[80px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            <span className="ml-2 text-sm text-gray-400">Loading…</span>
          </div>
        ) : empty ? (
          <div className="flex flex-col items-center justify-center rounded-xl bg-gray-50 py-8 px-4 text-center">
            <Inbox className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-xs text-gray-400">{emptyMessage ?? "No data yet"}</p>
          </div>
        ) : (
          children
        )}
      </div>

      {/* CTA */}
      {ctaElement}
    </div>
  );
}
