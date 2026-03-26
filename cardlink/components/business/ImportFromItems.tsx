"use client";

import { useEffect, useState, useCallback } from "react";
import { Package, Download, X, Check } from "lucide-react";

type MasterItem = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  unit_price: number;
  cost_price: number;
  unit: string;
  tax_rate: number;
};

type Props = {
  /** Called when user confirms import with selected items */
  onImport: (items: MasterItem[]) => void;
  /** Optional: IDs already imported (will show as disabled) */
  alreadyImportedIds?: string[];
};

const SCOPE_HEADERS = { "x-cardlink-app-scope": "business" };

/**
 * Modal/panel component that lists master items and lets the user
 * select which ones to import into the current module.
 */
export default function ImportFromItems({ onImport, alreadyImportedIds = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/items", { headers: SCOPE_HEADERS, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) void loadItems(); }, [open, loadItems]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = () => {
    const selectedItems = items.filter((i) => selected.has(i.id));
    onImport(selectedItems);
    setOpen(false);
    setSelected(new Set());
  };

  const alreadySet = new Set(alreadyImportedIds);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="app-secondary-btn flex items-center gap-1.5 px-3 py-2 text-xs font-semibold"
      >
        <Download className="h-3.5 w-3.5" />
        Import from Items
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-600" />
                <h2 className="text-sm font-bold text-gray-900">Import from Item Catalog</h2>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Select items to import into this module. Already imported items are shown as disabled.
            </p>

            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {loading && <p className="text-xs text-gray-500 py-4 text-center">Loading items…</p>}

              {!loading && items.length === 0 && (
                <div className="py-8 text-center">
                  <Package className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-2 text-xs text-gray-500">No items in the catalog. Create items in the Item Catalog first.</p>
                </div>
              )}

              {!loading && items.map((item) => {
                const isAlready = alreadySet.has(item.id);
                const isSelected = selected.has(item.id);

                return (
                  <button
                    key={item.id}
                    disabled={isAlready}
                    onClick={() => toggleSelect(item.id)}
                    className={`w-full text-left flex items-center gap-3 rounded-xl border px-3 py-2 transition ${
                      isAlready
                        ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                        : isSelected
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-gray-100 bg-white hover:border-indigo-200"
                    }`}
                  >
                    <div className={`flex h-5 w-5 items-center justify-center rounded border ${
                      isAlready
                        ? "border-gray-300 bg-gray-100"
                        : isSelected
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-gray-300"
                    }`}>
                      {(isAlready || isSelected) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        {item.sku && <span className="font-mono">{item.sku}</span>}
                        {item.category && <span>{item.category}</span>}
                        <span>${item.unit_price}</span>
                      </div>
                    </div>
                    {isAlready && (
                      <span className="text-[10px] text-gray-400">Imported</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex gap-2 border-t pt-3">
              <button onClick={() => setOpen(false)} className="app-secondary-btn flex-1 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selected.size === 0}
                className="app-primary-btn flex-1 py-2 text-sm disabled:opacity-50"
              >
                Import {selected.size > 0 ? `(${selected.size})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
