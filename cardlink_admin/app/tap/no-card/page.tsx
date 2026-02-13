import { CreditCard } from "lucide-react";
import { getTranslations } from "next-intl/server";

import StatusLayout from "../StatusLayout";

export default async function TapNoCardPage() {
  const t = await getTranslations("tap");
  return (
    <StatusLayout
      icon={CreditCard}
      title={t("noCard.title")}
      body={t("noCard.body")}
      linkLabel={t("noCard.link")}
      linkHref="/dashboard"
    />
  );
}
