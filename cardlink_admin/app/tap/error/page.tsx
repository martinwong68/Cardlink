import { AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import StatusLayout from "../StatusLayout";

export default async function TapErrorPage() {
  const t = await getTranslations("tap");
  return (
    <StatusLayout
      icon={AlertTriangle}
      title={t("error.title")}
      body={t("error.body")}
    />
  );
}
