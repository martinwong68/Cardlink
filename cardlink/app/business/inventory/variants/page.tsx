"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layers, ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * Inventory Variants — now consolidated into the central Item Master.
 * Variable products in Item Master support WooCommerce-style variations.
 */
export default function VariantsPage() {
  const router = useRouter();

  useEffect(() => {
    const REDIRECT_DELAY_MS = 3000;
    const timeout = setTimeout(() => {
      router.push("/business/items");
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <Layers className="h-12 w-12 text-indigo-300" />
      <h1 className="text-lg font-bold text-gray-900">Variants moved to Item Master</h1>
      <p className="text-sm text-gray-500 text-center max-w-md">
        Product variants are now managed through the central <strong>Item Master</strong> using
        WooCommerce-style attributes &amp; variations. You will be redirected automatically.
      </p>
      <Link
        href="/business/items"
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
      >
        Go to Item Master <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
