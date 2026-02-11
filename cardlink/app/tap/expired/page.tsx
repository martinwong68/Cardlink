import { Clock } from "lucide-react";

import StatusLayout from "../StatusLayout";

export default function TapExpiredPage() {
  return (
    <StatusLayout
      icon={Clock}
      title="Subscription Expired"
      body="The owner's subscription has expired. If this is your card, please renew your subscription."
      linkLabel="Renew Subscription"
      linkHref="/dashboard/billing"
    />
  );
}
