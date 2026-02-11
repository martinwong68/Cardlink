import { ShieldOff } from "lucide-react";

import StatusLayout from "../StatusLayout";

export default function TapSuspendedPage() {
  return (
    <StatusLayout
      icon={ShieldOff}
      title="Card Suspended"
      body="This card has been temporarily suspended. Please contact the card owner or CardLink support."
      linkLabel="Learn more"
      linkHref="/support"
      tone="muted"
    />
  );
}
