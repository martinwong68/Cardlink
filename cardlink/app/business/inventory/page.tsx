"use client";

import { useEffect, useState } from "react";

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  is_active: boolean;
};

type BalanceRow = {
  product_id: string;
  on_hand: number;
  updated_at: string;
};

export default function BusinessInventoryPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pcs");

  const [movementProductId, setMovementProductId] = useState("");
  const [movementType, setMovementType] = useState<"in" | "out" | "adjust">("in");
  const [movementQty, setMovementQty] = useState("1");
  const [movementReason, setMovementReason] = useState("");

  const scopeHeaders = {
    "content-type": "application/json",
    "x-cardlink-app-scope": "business",
  };

  const loadData = async () => {
    setIsLoading(true);
    setMessage("");

    const [productsRes, balancesRes] = await Promise.all([
      fetch("/api/inventory/products", {
        method: "GET",
        headers: {
          "x-cardlink-app-scope": "business",
        },
        cache: "no-store",
      }),
      fetch("/api/inventory/balances", {
        method: "GET",
        headers: {
          "x-cardlink-app-scope": "business",
        },
        cache: "no-store",
      }),
    ]);

    const productsBody = (await productsRes.json()) as { error?: string; products?: ProductRow[] };
    const balancesBody = (await balancesRes.json()) as { error?: string; balances?: BalanceRow[] };

    if (!productsRes.ok) {
      setMessage(productsBody.error ?? "Failed to load products.");
      setIsLoading(false);
      return;
    }

    if (!balancesRes.ok) {
      setMessage(balancesBody.error ?? "Failed to load balances.");
      setIsLoading(false);
      return;
    }

    const nextProducts = productsBody.products ?? [];
    setProducts(nextProducts);
    setBalances(balancesBody.balances ?? []);
    if (!movementProductId && nextProducts.length > 0) {
      setMovementProductId(nextProducts[0].id);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const createProduct = async () => {
    setMessage("");
    const response = await fetch("/api/inventory/products", {
      method: "POST",
      headers: scopeHeaders,
      body: JSON.stringify({ sku, name, unit }),
    });
    const body = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(body.error ?? "Create product failed.");
      return;
    }

    setMessage("Product created.");
    setSku("");
    setName("");
    setUnit("pcs");
    await loadData();
  };

  const createMovement = async () => {
    setMessage("");
    const qty = Number(movementQty);
    const response = await fetch("/api/inventory/movements", {
      method: "POST",
      headers: scopeHeaders,
      body: JSON.stringify({
        product_id: movementProductId,
        movement_type: movementType,
        qty,
        reason: movementReason || null,
      }),
    });
    const body = (await response.json()) as { error?: string; status?: string };

    if (!response.ok) {
      setMessage(body.error ?? "Create movement failed.");
      return;
    }

    setMessage(`Movement ${body.status ?? "created"}.`);
    setMovementReason("");
    await loadData();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="app-kicker">Business App</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">Inventory</h1>
        <p className="app-subtitle mt-1 text-sm">
          Create products, post stock movements, and view live balances.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="app-card space-y-3 p-5">
          <h2 className="text-sm font-semibold text-gray-800">Create Product</h2>
          <input
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            placeholder="SKU"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder="Unit"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void createProduct()}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            POST /api/inventory/products
          </button>
        </section>

        <section className="app-card space-y-3 p-5">
          <h2 className="text-sm font-semibold text-gray-800">Create Movement</h2>
          <select
            value={movementProductId}
            onChange={(event) => setMovementProductId(event.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">Select Product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.sku})
              </option>
            ))}
          </select>
          <select
            value={movementType}
            onChange={(event) => setMovementType(event.target.value as "in" | "out" | "adjust")}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="in">in</option>
            <option value="out">out</option>
            <option value="adjust">adjust</option>
          </select>
          <input
            value={movementQty}
            onChange={(event) => setMovementQty(event.target.value)}
            placeholder="Qty"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={movementReason}
            onChange={(event) => setMovementReason(event.target.value)}
            placeholder="Reason (optional)"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void createMovement()}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            POST /api/inventory/movements
          </button>
        </section>
      </div>

      <section className="app-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Products & Balances</h2>
          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700"
          >
            Refresh
          </button>
        </div>
        {isLoading ? <p className="text-sm text-gray-500">Loading...</p> : null}
        {!isLoading ? (
          <div className="space-y-2 text-sm">
            {products.map((product) => {
              const balance = balances.find((item) => item.product_id === product.id);
              return (
                <div key={product.id} className="rounded-xl border border-gray-100 px-3 py-2">
                  <p className="font-semibold text-gray-800">
                    {product.name} ({product.sku})
                  </p>
                  <p className="text-gray-600">
                    on_hand: {balance?.on_hand ?? 0} {product.unit}
                  </p>
                </div>
              );
            })}
            {products.length === 0 ? <p className="text-gray-500">No products yet.</p> : null}
          </div>
        ) : null}
      </section>

      {message ? <p className="app-error px-3 py-2 text-sm">{message}</p> : null}
    </div>
  );
}
