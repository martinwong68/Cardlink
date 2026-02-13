import { Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";

import StatusLayout from "../StatusLayout";

export default async function TapExpiredPage() {
  const t = await getTranslations("tap");
  return (
    <StatusLayout
      icon={Clock}
      title={t("expired.title")}
      body={t("expired.body")}
      linkLabel={t("expired.link")}
      linkHref="/dashboard/billing"
    />
  );
}
