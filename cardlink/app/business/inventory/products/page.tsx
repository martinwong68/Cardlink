"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Package, ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * Inventory Products — now consolidated into the central Item Master.
 * This page shows an informational redirect message.
 */
export default function InventoryProductsPage() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.push("/business/items");
    }, 5000);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <Package className="h-12 w-12 text-indigo-300" />
      <h1 className="text-lg font-bold text-gray-900">Products moved to Item Master</h1>
      <p className="text-sm text-gray-500 text-center max-w-md">
        All product data has been consolidated into the central <strong>Item Master</strong>.
        You will be redirected automatically.
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
