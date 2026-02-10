"use client";

import { useState } from "react";

type Interval = "monthly" | "yearly";

export default function UpgradePage() {
  const [isLoading, setIsLoading] = useState<Interval | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleCheckout = async (interval: Interval) => {
    setMessage(null);
    setIsLoading(interval);

    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval }),
    });

    if (!response.ok) {
      setMessage("Unable to start checkout.");
      setIsLoading(null);
      return;
    }

    const data = (await response.json()) as { url?: string };
    if (!data.url) {
      setMessage("Checkout unavailable.");
      setIsLoading(null);
      return;
    }

    window.location.href = data.url;
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
          CardLink
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Upgrade
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Unlock premium tools to grow your network.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Free</h2>
            <span className="text-xs font-semibold text-slate-500">
              Free forever
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold text-slate-900">$0</p>
          <ul className="mt-6 space-y-3 text-sm text-slate-600">
            <li>1 business card</li>
            <li>5 contact fields</li>
            <li>View public info only</li>
            <li>Connect with others</li>
            <li>Basic feed access</li>
          </ul>
        </div>

        <div className="relative rounded-3xl border-2 border-violet-600 bg-white p-6 shadow-lg">
          <div className="absolute -top-4 left-6 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white">
            Popular
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Premium</h2>
            <span className="text-xs font-semibold text-slate-500">
              $9.99/month
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">Or $99/year</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">
            $9.99
          </p>
          <ul className="mt-6 space-y-3 text-sm text-slate-600">
            <li>Unlimited business cards</li>
            <li>Unlimited contact fields</li>
            <li>See friends' full details</li>
            <li>CRM notes, tags & reminders</li>
            <li>Card scan analytics</li>
            <li>Export contacts (CSV/vCard)</li>
            <li>Custom card themes</li>
            <li>Priority support</li>
          </ul>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleCheckout("monthly")}
              disabled={isLoading !== null}
              className="rounded-full bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading === "monthly" ? "Redirecting..." : "Upgrade Monthly"}
            </button>
            <button
              type="button"
              onClick={() => handleCheckout("yearly")}
              disabled={isLoading !== null}
              className="rounded-full border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-600 shadow-sm transition hover:border-violet-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading === "yearly" ? "Redirecting..." : "Upgrade Yearly"}
            </button>
          </div>
        </div>
      </div>

      {message ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {message}
        </p>
      ) : null}
    </div>
  );
}
