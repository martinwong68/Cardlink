import { ShieldOff } from "lucide-react";
import { getTranslations } from "next-intl/server";

import StatusLayout from "../StatusLayout";

export default async function TapSuspendedPage() {
  const t = await getTranslations("tap");
  return (
    <StatusLayout
      icon={ShieldOff}
      title={t("suspended.title")}
      body={t("suspended.body")}
      linkLabel={t("suspended.link")}
      linkHref="/support"
      tone="muted"
    />
  );
}
