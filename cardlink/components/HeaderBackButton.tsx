"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

type HeaderBackButtonProps = {
  fallbackHref?: string;
  className?: string;
  ariaLabel?: string;
  variant?: "light" | "dark";
};

export default function HeaderBackButton({
  fallbackHref = "/dashboard/community",
  className = "",
  ariaLabel = "Go back",
  variant = "light",
}: HeaderBackButtonProps) {
  const router = useRouter();

  const baseClass =
    variant === "dark"
      ? "inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
      : "inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-100 bg-white text-neutral-600 transition hover:border-primary-200 hover:text-primary-600";

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
      className={`${baseClass} ${className}`}
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
  );
}