"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/**
 * ModuleShell — universal wrapper for business module pages.
 *
 * On the landing page it renders children directly (slider handles nav).
 * On sub-pages it shows a lightweight back-link to the module root.
 */
export default function ModuleShell({
  basePath,
  moduleLabel,
  children,
}: {
  basePath: string;
  moduleLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLanding = pathname === basePath || pathname === `${basePath}/`;

  return (
    <div className="space-y-4 md:space-y-5">
      {!isLanding && (
        <Link
          href={basePath}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>{moduleLabel}</span>
        </Link>
      )}
      {children}
    </div>
  );
}
