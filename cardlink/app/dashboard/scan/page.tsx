"use client";

import { QrCode } from "lucide-react";

export default function ScanPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
          CardLink
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Scan
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Scan QR codes to add new connections.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
          <QrCode className="h-8 w-8" />
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Camera access will be enabled here soon.
        </p>
      </div>
    </div>
  );
}
