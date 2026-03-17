"use client";

import { useEffect, useState } from "react";

import { accountingGet } from "@/src/lib/accounting/client";
import type { CurrencyRow, TaxRateRow } from "@/src/lib/accounting/types";

export default function AccountingSettingsPage() {
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [currencyRes, taxRes] = await Promise.all([
        accountingGet<{ currencies: CurrencyRow[] }>("/api/accounting/currencies"),
        accountingGet<{ tax_rates: TaxRateRow[] }>("/api/accounting/tax-rates"),
      ]);
      setCurrencies(currencyRes.currencies ?? []);
      setTaxRates(taxRes.tax_rates ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load accounting settings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <div className="space-y-4 pb-28 md:pb-2">
      <section className="app-card p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-800">Currencies</h2>
          <button type="button" onClick={() => void loadData()} className="app-secondary-btn px-3 py-1.5 text-xs font-semibold">Refresh</button>
        </div>
        {isLoading ? <p className="text-sm text-neutral-500">Loading settings...</p> : null}
        {error ? <p className="app-error px-3 py-2 text-sm">{error}</p> : null}

        {!isLoading && !error ? (
          <div className="space-y-2">
            {currencies.map((currency) => (
              <div key={currency.id} className="rounded-xl border border-neutral-100 px-3 py-2 text-sm">
                <span className="font-semibold">{currency.code}</span> · {currency.name} ({currency.symbol}) · {currency.exchange_rate}
              </div>
            ))}
            {currencies.length === 0 ? <p className="text-sm text-neutral-500">No currencies configured.</p> : null}
          </div>
        ) : null}
      </section>

      <section className="app-card p-4 md:p-5">
        <h2 className="text-sm font-semibold text-neutral-800">Tax Rates</h2>
        {!isLoading && !error ? (
          <div className="mt-3 space-y-2">
            {taxRates.map((taxRate) => (
              <div key={taxRate.id} className="rounded-xl border border-neutral-100 px-3 py-2 text-sm">
                <span className="font-semibold">{taxRate.name}</span> · {taxRate.rate}% · {taxRate.region ?? "Global"}
              </div>
            ))}
            {taxRates.length === 0 ? <p className="text-sm text-neutral-500">No tax rates configured.</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
