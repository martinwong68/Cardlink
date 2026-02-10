"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

type RelativeTimeProps = {
  date: string | Date | null | undefined;
  className?: string;
};

export default function RelativeTime({ date, className }: RelativeTimeProps) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!date) {
      setLabel("");
      return;
    }

    const nextLabel = formatDistanceToNow(new Date(date), { addSuffix: true });
    setLabel(nextLabel);
  }, [date]);

  return <span className={className}>{label}</span>;
}
