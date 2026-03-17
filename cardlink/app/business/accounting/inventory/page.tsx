"use client";

import { useEffect, useState } from "react";

import { accountingGet } from "@/src/lib/accounting/client";
import type { InventoryItemRow } from "@/src/lib/accounting/types";

export default function AccountingInventoryPage() {
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await accountingGet<{ inventory_items: InventoryItemRow[] }>("/api/accounting/inventory-items");
      setItems(response.inventory_items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load inventory items.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <section className="app-card p-4 md:p-5 pb-28 md:pb-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Inventory</h2>
        <button type="button" onClick={() => void loadData()} className="app-secondary-btn px-3 py-1.5 text-xs font-semibold">Refresh</button>
      </div>

      {isLoading ? <p className="text-sm text-gray-500">Loading inventory...</p> : null}
      {error ? <p className="app-error px-3 py-2 text-sm">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-mono text-gray-500">{item.sku}</p>
              <p className="mt-1 text-base font-semibold text-gray-800">{item.name}</p>
              <p className="mt-2 text-sm text-gray-600">Qty: {item.quantity}</p>
              <p className="text-sm text-gray-600">Unit cost: {item.unit_cost}</p>
              <p className="text-xs text-gray-500">Category: {item.category ?? "-"}</p>
            </article>
          ))}
          {items.length === 0 ? <p className="text-sm text-gray-500">No inventory items found.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
