import { XCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import StatusLayout from "../StatusLayout";

export default async function TapDeactivatedPage() {
  const t = await getTranslations("tap");
  return (
    <StatusLayout
      icon={XCircle}
      title={t("deactivated.title")}
      body={t("deactivated.body")}
    />
  );
}
