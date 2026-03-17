"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

const STRIPE_PRICE_ID = process.env.NEXT_PUBLIC_NFC_CARD_PRICE_ID;
const DISPLAY_PRICE = process.env.NEXT_PUBLIC_NFC_CARD_PRICE_DISPLAY;

export default function DashboardNfcPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("getCard");

  const features = useMemo(
    () => [
      {
        title: t("features.instant.title"),
        description: t("features.instant.description"),
        icon: Sparkles,
      },
      {
        title: t("features.durable.title"),
        description: t("features.durable.description"),
        icon: ShieldCheck,
      },
      {
        title: t("features.tap.title"),
        description: t("features.tap.description"),
        icon: CreditCard,
      },
    ],
    [t]
  );

  const faqs = useMemo(
    () => [
      {
        question: t("faq.shipping.question"),
        answer: t("faq.shipping.answer"),
      },
      {
        question: t("faq.compatibility.question"),
        answer: t("faq.compatibility.answer"),
      },
      {
        question: t("faq.management.question"),
        answer: t("faq.management.answer"),
      },
      {
        question: t("faq.teams.question"),
        answer: t("faq.teams.answer"),
      },
    ],
    [t]
  );

  const handleCheckout = async () => {
    setError(null);
    setIsLoading(true);

    if (!STRIPE_PRICE_ID) {
      setError(t("errors.missingPrice"));
      setIsLoading(false);
      return;
    }

    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId: STRIPE_PRICE_ID }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? t("errors.checkout"));
      setIsLoading(false);
      return;
    }

    const data = (await response.json()) as { url?: string };
    if (!data.url) {
      setError(t("errors.unavailable"));
      setIsLoading(false);
      return;
    }

    window.location.href = data.url;
  };

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
              {t("brand")}
            </p>
            <h1 className="mt-2 text-xl font-semibold text-neutral-800">
              {t("title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-500">
              {t("subtitle")}
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary-600" />
                {t("highlights.shipping")}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary-600" />
                {t("highlights.customize")}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary-600" />
                {t("highlights.linked")}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary-600" />
                {t("highlights.analytics")}
              </li>
            </ul>
          </div>
          <div className="w-full max-w-sm rounded-xl border border-neutral-100 bg-neutral-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {t("cta.badge")}
            </p>
            <p className="mt-3 text-2xl font-semibold text-neutral-800">
              ${t("cta.price", { price: DISPLAY_PRICE ?? "58" })}
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              {t("cta.note")}
            </p>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isLoading}
              className="mt-4 w-full rounded-full bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? t("cta.loading") : t("cta.action")}
            </button>
            {error ? (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="rounded-xl border border-neutral-100 bg-white p-5 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-sm font-semibold text-neutral-800">
                {feature.title}
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                {feature.description}
              </p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
            {t("faq.badge")}
          </p>
          <h2 className="text-lg font-semibold text-neutral-800">
            {t("faq.title")}
          </h2>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {faqs.map((item) => (
            <div
              key={item.question}
              className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3"
            >
              <p className="text-sm font-semibold text-neutral-800">
                {item.question}
              </p>
              <p className="mt-1 text-xs text-neutral-500">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
