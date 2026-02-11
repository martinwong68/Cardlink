"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { zhCN, zhHK, zhTW } from "date-fns/locale";
import { useLocale } from "next-intl";

type RelativeTimeProps = {
  date: string | Date | null | undefined;
  className?: string;
};

export default function RelativeTime({ date, className }: RelativeTimeProps) {
  const [label, setLabel] = useState("");
  const locale = useLocale();

  useEffect(() => {
    if (!date) {
      setLabel("");
      return;
    }

    const dateLocale =
      locale === "zh-CN"
        ? zhCN
        : locale === "zh-TW"
        ? zhTW
        : locale === "zh-HK"
        ? zhHK
        : undefined;
    const nextLabel = formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: dateLocale,
    });
    setLabel(nextLabel);
  }, [date, locale]);

  return <span className={className}>{label}</span>;
}
