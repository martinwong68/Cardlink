"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

const localeOptions = [
  { value: "en", label: "English" },
  { value: "zh-HK", label: "繁體中文 (香港)" },
  { value: "zh-TW", label: "繁體中文 (台灣)" },
  { value: "zh-CN", label: "简体中文" },
  { value: "ko", label: "한국어" },
  { value: "ja", label: "日本語" },
];

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("language");
  const current = useMemo(
    () => localeOptions.find((option) => option.value === locale),
    [locale]
  );

  const handleChange = (nextLocale: string) => {
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=${maxAge}`;
    router.refresh();
  };

  return (
    <div className={compact ? "" : "flex items-center gap-2"}>
      <label className={compact ? "sr-only" : "text-xs font-semibold text-gray-500"}>
        {t("label")}
      </label>
      <select
        value={current?.value ?? "en"}
        onChange={(event) => handleChange(event.target.value)}
        className={`rounded-full border border-gray-100 bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm ${
          compact ? "" : ""
        }`}
      >
        {localeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
