"use client";

import { useEffect, useMemo, useState } from "react";

import { accountingGet } from "@/src/lib/accounting/client";
import type { ContactRow } from "@/src/lib/accounting/types";

const filters: Array<ContactRow["type"] | "all"> = ["all", "customer", "vendor", "employee"];

export default function AccountingContactsPage() {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [filter, setFilter] = useState<ContactRow["type"] | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await accountingGet<{ contacts: ContactRow[] }>("/api/accounting/contacts");
      setContacts(response.contacts ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load contacts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredContacts = useMemo(() => {
    if (filter === "all") {
      return contacts;
    }
    return contacts.filter((contact) => contact.type === filter);
  }, [contacts, filter]);

  return (
    <div className="space-y-4 pb-28 md:pb-2">
      <section className="app-card p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-neutral-800">Contacts</h2>
          <button type="button" onClick={() => void loadData()} className="app-secondary-btn px-3 py-1.5 text-xs font-semibold">Refresh</button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                filter === item ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {isLoading ? <p className="text-sm text-neutral-500">Loading contacts...</p> : null}
        {error ? <p className="app-error px-3 py-2 text-sm">{error}</p> : null}

        {!isLoading && !error ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredContacts.map((contact) => (
              <article key={contact.id} className="rounded-xl border border-neutral-100 p-4">
                <p className="text-base font-semibold text-neutral-800">{contact.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-neutral-500">{contact.type}</p>
                <p className="mt-2 text-sm text-neutral-600">{contact.email ?? "No email"}</p>
                <p className="text-sm text-neutral-600">{contact.phone ?? "No phone"}</p>
              </article>
            ))}
            {filteredContacts.length === 0 ? <p className="text-sm text-neutral-500">No contacts found.</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
