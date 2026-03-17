"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CreditCard, LifeBuoy, Mail, Shield } from "lucide-react";

export default function SupportPage() {
  const t = useTranslations("support");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const faqItems = t.raw("faq.items") as { question: string; answer: string }[];
  const privacySections = t.raw("privacy.sections") as {
    title: string;
    body: string[];
  }[];

  const openBillingPortal = async () => {
    setMessage(null);
    setIsLoading(true);

    const response = await fetch("/api/stripe/portal", { method: "POST" });
    if (!response.ok) {
      setMessage(t("errors.portal"));
      setIsLoading(false);
      return;
    }

    const data = (await response.json()) as { url?: string };
    if (!data.url) {
      setMessage(t("errors.portal"));
      setIsLoading(false);
      return;
    }

    window.location.href = data.url;
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="app-kicker">
          {t("brand")}
        </p>
        <h1 className="app-title mt-2 text-2xl font-semibold">
          {t("title")}
        </h1>
        <p className="app-subtitle mt-2 text-sm">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="app-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
            <LifeBuoy className="h-4 w-4 text-primary-500" />
            {t("contact.title")}
          </div>
          <p className="mt-2 text-sm text-neutral-500">
            {t("contact.subtitle")}
          </p>
          <div className="mt-4 space-y-3 text-sm text-neutral-700">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-neutral-400" />
              <span className="text-neutral-500">{t("contact.emailLabel")}</span>
              <a
                className="font-semibold text-primary-600 hover:text-primary-700"
                href={`mailto:${t("contact.emailValue")}`}
              >
                {t("contact.emailValue")}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-neutral-400" />
              <span className="text-neutral-500">{t("contact.hoursLabel")}</span>
              <span className="font-semibold text-neutral-700">
                {t("contact.hoursValue")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-neutral-400" />
              <span className="text-neutral-500">{t("contact.responseLabel")}</span>
              <span className="font-semibold text-neutral-700">
                {t("contact.responseValue")}
              </span>
            </div>
          </div>
        </div>

        <div className="app-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
            <CreditCard className="h-4 w-4 text-primary-500" />
            {t("subscription.title")}
          </div>
          <p className="mt-2 text-sm text-neutral-500">
            {t("subscription.subtitle")}
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={openBillingPortal}
              disabled={isLoading}
              className="app-primary-btn px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? t("subscription.loading") : t("subscription.button")}
            </button>
            <p className="mt-3 text-xs text-neutral-500">
              {t("subscription.note")}
            </p>
          </div>
        </div>
      </div>

      <div className="app-card p-6">
        <h2 className="text-sm font-semibold text-neutral-900">
          {t("faq.title")}
        </h2>
        <div className="mt-4 space-y-4 text-sm text-neutral-600">
          {faqItems.map((item, index) => (
            <div key={`${item.question}-${index}`}>
              <p className="font-semibold text-neutral-800">{item.question}</p>
              <p className="mt-1 text-neutral-500">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="app-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <Shield className="h-4 w-4 text-primary-500" />
          {t("privacy.title")}
        </div>
        <p className="mt-2 text-sm text-neutral-500">{t("privacy.subtitle")}</p>
        <p className="mt-2 text-xs text-neutral-400">{t("privacy.lastUpdated")}</p>
        <div className="mt-6 space-y-5 text-sm text-neutral-600">
          {privacySections.map((section, index) => (
            <div key={`${section.title}-${index}`}>
              <h3 className="text-sm font-semibold text-neutral-900">
                {section.title}
              </h3>
              <div className="mt-2 space-y-2">
                {section.body.map((paragraph, paragraphIndex) => (
                  <p key={`${section.title}-${paragraphIndex}`}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {message ? (
        <p className="app-error px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
