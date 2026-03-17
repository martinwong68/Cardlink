"use client";

import { useEffect, useState } from "react";

import { accountingGet } from "@/src/lib/accounting/client";
import type { DocumentRow } from "@/src/lib/accounting/types";

export default function AccountingDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await accountingGet<{ documents: DocumentRow[] }>("/api/accounting/documents");
      setDocuments(response.documents ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load documents.");
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
        <h2 className="text-sm font-semibold text-neutral-800">Documents</h2>
        <button type="button" onClick={() => void loadData()} className="app-secondary-btn px-3 py-1.5 text-xs font-semibold">Refresh</button>
      </div>

      {isLoading ? <p className="text-sm text-neutral-500">Loading documents...</p> : null}
      {error ? <p className="app-error px-3 py-2 text-sm">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <article key={doc.id} className="rounded-xl border border-neutral-100 p-3">
              <p className="text-sm font-semibold text-neutral-800">{doc.file_url}</p>
              <p className="mt-1 text-xs text-neutral-500">Uploaded: {new Date(doc.created_at).toLocaleString()}</p>
              <p className="mt-2 text-xs text-neutral-600">OCR: {doc.ocr_text ? "Complete" : "Not available"}</p>
            </article>
          ))}
          {documents.length === 0 ? <p className="text-sm text-neutral-500">No documents found.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
