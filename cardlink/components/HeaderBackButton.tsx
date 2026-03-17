"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

type HeaderBackButtonProps = {
  fallbackHref?: string;
  className?: string;
  ariaLabel?: string;
};

export default function HeaderBackButton({
  fallbackHref = "/dashboard/community",
  className = "",
  ariaLabel = "Go back",
}: HeaderBackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
      aria-label={ariaLabel}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600 ${className}`}
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
  );
}